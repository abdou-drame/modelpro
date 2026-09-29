import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { SalesOrder } from '../models/SalesOrder';
import { Invoice } from '../models/Invoice';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { CompanySubscription } from '../models/CompanySubscription';

jest.setTimeout(30000);

let adminToken: string;
let companyId: number;
let customerId: number;
let supplierId: number;
let siteSecondaireId: number;
let sitePrincipalId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Le plan d'essai par défaut ('business') donne accès à reporting_site — pas besoin de changer
  // de plan pour ces tests.
  const reg = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Atelier Multisite', nom: 'Sow', prenom: 'Bineta', telephone: '760000001', password: 'password',
  });
  adminToken = reg.body.token;
  companyId = reg.body.company.id;

  const sites = await request(app).get('/api/v1/crm/sites').set('Authorization', `Bearer ${adminToken}`);
  sitePrincipalId = sites.body[0].id; // site principal créé automatiquement à l'inscription

  const secondSite = await request(app).post('/api/v1/crm/sites').set('Authorization', `Bearer ${adminToken}`)
    .send({ nom: 'Boutique Sandaga' });
  siteSecondaireId = secondSite.body.id;

  const cust = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${adminToken}`).send({ nom: 'Client Multisite' });
  customerId = cust.body.customer.id;

  const supplier = await request(app).post('/api/v1/crm/suppliers').set('Authorization', `Bearer ${adminToken}`).send({ nom: 'Fournisseur Multisite' });
  supplierId = supplier.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Reporting multisite — rattachement d’un site aux documents commerciaux', () => {
  it('un devis créé sans siteId précisé se rattache automatiquement au site principal', async () => {
    const res = await request(app).post('/api/v1/crm/quotes').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, lines: [{ designation: 'Test', quantite: 1, prixUnitaire: 1000 }] });
    expect(res.status).toBe(201);
    expect(res.body.siteId).toBe(sitePrincipalId);
  });

  it('un devis créé avec un siteId explicite le conserve, et la commande issue de sa conversion hérite du même site', async () => {
    const quote = await request(app).post('/api/v1/crm/quotes').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, siteId: siteSecondaireId, lines: [{ designation: 'Test', quantite: 1, prixUnitaire: 1000 }] });
    expect(quote.body.siteId).toBe(siteSecondaireId);

    await request(app).patch(`/api/v1/crm/quotes/${quote.body.id}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/crm/quotes/${quote.body.id}/accept`).set('Authorization', `Bearer ${adminToken}`);
    const order = await request(app).post(`/api/v1/crm/quotes/${quote.body.id}/convert-to-order`).set('Authorization', `Bearer ${adminToken}`);
    expect(order.body.siteId).toBe(siteSecondaireId);

    const orderInDb = await SalesOrder.findByPk(order.body.id);
    expect(orderInDb!.siteId).toBe(siteSecondaireId);
  });

  it('une facture issue de la conversion d’une commande hérite du site de la commande', async () => {
    const order = await request(app).post('/api/v1/crm/orders').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, siteId: siteSecondaireId, lines: [{ designation: 'Prestation', quantite: 1, prixUnitaire: 20000 }] });
    await request(app).patch(`/api/v1/crm/orders/${order.body.id}/confirm`).set('Authorization', `Bearer ${adminToken}`);
    const invoice = await request(app).post(`/api/v1/crm/orders/${order.body.id}/convert-to-invoice`).set('Authorization', `Bearer ${adminToken}`);
    expect(invoice.status).toBe(201);
    expect(invoice.body.siteId).toBe(siteSecondaireId);

    const invoiceInDb = await Invoice.findByPk(invoice.body.id);
    expect(invoiceInDb!.siteId).toBe(siteSecondaireId);
  });

  it('un devis référençant un site d’une autre entreprise retombe silencieusement sur le site principal (jamais bloquant)', async () => {
    const other = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Autre Entreprise Multisite', nom: 'Ka', prenom: 'Ibra', telephone: '760000002', password: 'password',
    });
    const otherSites = await request(app).get('/api/v1/crm/sites').set('Authorization', `Bearer ${other.body.token}`);
    const otherSiteId = otherSites.body[0].id;

    const res = await request(app).post('/api/v1/crm/quotes').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, siteId: otherSiteId, lines: [{ designation: 'Test', quantite: 1, prixUnitaire: 1000 }] });
    expect(res.status).toBe(201);
    expect(res.body.siteId).toBe(sitePrincipalId); // jamais le site d'une autre entreprise
  });

  it('une commande fournisseur se rattache aussi à un site', async () => {
    const res = await request(app).post('/api/v1/crm/purchase-orders').set('Authorization', `Bearer ${adminToken}`)
      .send({ supplierId, siteId: siteSecondaireId, lines: [{ designation: 'Fourniture', quantite: 1, prixUnitaire: 5000 }] });
    expect(res.status).toBe(201);
    expect(res.body.siteId).toBe(siteSecondaireId);

    const inDb = await PurchaseOrder.findByPk(res.body.id);
    expect(inDb!.siteId).toBe(siteSecondaireId);
  });

  it('un avoir hérite du site de la facture d’origine', async () => {
    const invoice = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, siteId: siteSecondaireId, lines: [{ designation: 'Prestation', quantite: 1, prixUnitaire: 10000 }] });
    await request(app).patch(`/api/v1/crm/invoices/${invoice.body.id}/send`).set('Authorization', `Bearer ${adminToken}`);
    const avoir = await request(app).post(`/api/v1/crm/invoices/${invoice.body.id}/credit-note`).set('Authorization', `Bearer ${adminToken}`).send({});
    expect(avoir.status).toBe(201);
    expect(avoir.body.siteId).toBe(siteSecondaireId);
  });

  it('le tableau de bord ventile le chiffre d’affaires par site (reporting_site, Business)', async () => {
    const invoice = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, siteId: siteSecondaireId, lines: [{ designation: 'Prestation', quantite: 1, prixUnitaire: 50000 }] });
    await request(app).patch(`/api/v1/crm/invoices/${invoice.body.id}/send`).set('Authorization', `Bearer ${adminToken}`);

    const dash = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(dash.status).toBe(200);
    expect(Array.isArray(dash.body.parSite)).toBe(true);
    const boutique = dash.body.parSite.find((s: any) => s.site === 'Boutique Sandaga');
    expect(boutique).toBeTruthy();
    expect(boutique.ca).toBeGreaterThanOrEqual(50000);
  });

  it('sans la fonctionnalité reporting_site (formule Essentiel), parSite est null', async () => {
    const essentielCompany = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Essentiel Multisite', nom: 'Diallo', prenom: 'Cheikh', telephone: '760000003', password: 'password',
    });

    // Repasse l'entreprise sur le plan 'essentiel' directement en base (plus simple ici que de
    // recréer tout un compte superadmin ATAABA dans ce fichier de test dédié au multisite).
    const essentiel = await SubscriptionPlan.findOne({ where: { code: 'essentiel' } });
    await CompanySubscription.update({ planId: essentiel!.id }, { where: { companyId: essentielCompany.body.company.id } });

    const dash = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${essentielCompany.body.token}`);
    expect(dash.status).toBe(200);
    expect(dash.body.parSite).toBeNull();
  });
});
