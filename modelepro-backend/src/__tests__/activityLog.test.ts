import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { hashPassword } from '../utils/auth';

jest.setTimeout(30000);

let adminToken: string;
let readonlyToken: string;
let otherCompanyToken: string;
let companyId: number;
let customerId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const reg = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Atelier Activite', nom: 'Sarr', prenom: 'Khady', telephone: '750000001', password: 'password',
  });
  adminToken = reg.body.token;
  companyId = reg.body.company.id;

  await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
    .send({ nom: 'Membre', prenom: 'Lecture', telephone: '750000002', password: 'password', companyRole: 'readonly' });
  const login = await request(app).post('/api/v1/auth/login').send({ telephone: '750000002', password: 'password' });
  readonlyToken = login.body.token;

  const other = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Autre Entreprise', nom: 'Ba', prenom: 'Omar', telephone: '750000003', password: 'password',
  });
  otherCompanyToken = other.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Journal d’activité entreprise (visibilité d’équipe, distinct du journal interne ATAABA)', () => {
  it('l’ajout d’un membre apparaît dans le journal avec l’auteur et les détails corrects', async () => {
    const res = await request(app).get('/api/v1/companies/me/activity-log').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    const entry = res.body.data.find((e: any) => e.action === 'membre.ajoute');
    expect(entry).toBeTruthy();
    expect(entry.auteur).toBe('Khady Sarr');
    expect(entry.details.companyRole).toBe('readonly');
  });

  it('la création d’un client apparaît dans le journal, filtrable par préfixe d’action', async () => {
    const customer = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Client Test', telephone: '770111111' });
    customerId = customer.body.customer.id;

    const res = await request(app).get('/api/v1/companies/me/activity-log?action=client').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((e: any) => e.action === 'client.cree' && e.objectId === customerId)).toBe(true);
    expect(res.body.data.every((e: any) => e.action.startsWith('client'))).toBe(true);
  });

  it('l’envoi puis l’acceptation d’un devis, et sa transformation en commande, apparaissent dans le journal', async () => {
    const quote = await request(app).post('/api/v1/crm/quotes').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, lines: [{ designation: 'Service', quantite: 1, prixUnitaire: 10000 }] });
    const quoteId = quote.body.id;
    await request(app).patch(`/api/v1/crm/quotes/${quoteId}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/crm/quotes/${quoteId}/accept`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).post(`/api/v1/crm/quotes/${quoteId}/convert-to-order`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app).get('/api/v1/companies/me/activity-log').set('Authorization', `Bearer ${adminToken}`);
    const actions = res.body.data.map((e: any) => e.action);
    expect(actions).toContain('devis.envoye');
    expect(actions).toContain('devis.accepte');
    expect(actions).toContain('devis.transforme_en_commande');
  });

  it('l’enregistrement d’un paiement de facture apparaît avec le montant dans les détails', async () => {
    const invoice = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, lines: [{ designation: 'Prestation', quantite: 1, prixUnitaire: 15000 }] });
    const invoiceId = invoice.body.id;
    await request(app).patch(`/api/v1/crm/invoices/${invoiceId}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).post(`/api/v1/crm/invoices/${invoiceId}/payments`).set('Authorization', `Bearer ${adminToken}`).send({ montant: 15000 });

    const res = await request(app).get('/api/v1/companies/me/activity-log?action=facture').set('Authorization', `Bearer ${adminToken}`);
    const paiement = res.body.data.find((e: any) => e.action === 'facture.paiement_enregistre');
    expect(paiement).toBeTruthy();
    expect(paiement.details.montant).toBe(15000);
  });

  it('un membre readonly peut lire le journal (visibilité d’équipe, pas réservé aux admins)', async () => {
    const res = await request(app).get('/api/v1/companies/me/activity-log').set('Authorization', `Bearer ${readonlyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('isolation stricte : une autre entreprise ne voit jamais ce journal', async () => {
    const res = await request(app).get('/api/v1/companies/me/activity-log').set('Authorization', `Bearer ${otherCompanyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('le changement de rôle et le retrait d’un membre apparaissent dans le journal', async () => {
    const member = await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Temp', prenom: 'Membre', telephone: '750000004', password: 'password', companyRole: 'commercial' });
    const memberId = member.body.id;
    await request(app).patch(`/api/v1/companies/members/${memberId}/role`).set('Authorization', `Bearer ${adminToken}`).send({ companyRole: 'finance' });
    await request(app).delete(`/api/v1/companies/members/${memberId}`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app).get('/api/v1/companies/me/activity-log?action=membre').set('Authorization', `Bearer ${adminToken}`);
    const actions = res.body.data.map((e: any) => e.action);
    expect(actions).toContain('membre.role_modifie');
    expect(actions).toContain('membre.retire');
  });

  it('les actions du personnel ATAABA (back-office) n’apparaissent jamais dans ce journal', async () => {
    await User.create({
      nom: 'Staff', prenom: 'Ataaba', telephone: '750000099', password: await hashPassword('password'),
      role: 'ataaba_staff', statut: 'actif', platformRole: 'superadmin',
    });
    const staffLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '750000099', password: 'password' });
    await request(app).patch(`/api/v1/backoffice/companies/${companyId}/suspend`).set('Authorization', `Bearer ${staffLogin.body.token}`).send({ motif: 'Test' });

    const res = await request(app).get('/api/v1/companies/me/activity-log').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.data.some((e: any) => e.action.includes('suspend'))).toBe(false);

    await request(app).patch(`/api/v1/backoffice/companies/${companyId}/reactivate`).set('Authorization', `Bearer ${staffLogin.body.token}`);
  });
});
