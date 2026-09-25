import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAReadonlyToken: string;
let companyBAdminToken: string;

let customerAId: number;
let contactAId: number;
let productAId: number;
let quoteId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Devis Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '785000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ndiaye', prenom: 'Aida', telephone: '785000002', password: 'password', companyRole: 'readonly' });
  const readonlyLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '785000002', password: 'password' });
  companyAReadonlyToken = readonlyLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Devis Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '785000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const customerRes = await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Client Devis', telephone: '770888888' });
  customerAId = customerRes.body.customer.id;

  const contactRes = await request(app)
    .post(`/api/v1/crm/customers/${customerAId}/contacts`)
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Diallo', prenom: 'Awa' });
  contactAId = contactRes.body.id;

  const productRes = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Robe sur mesure', prixUnitaire: 10000, tauxTaxe: 18 });
  productAId = productRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('ERP — Devis', () => {
  it('crée un devis avec lignes, numérotation DEV-YYYY-0001 et totaux corrects', async () => {
    const year = new Date().getFullYear();
    const res = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({
        customerId: customerAId,
        contactId: contactAId,
        remiseGlobale: 1000,
        lines: [
          { productId: productAId, quantite: 2, remisePct: 10 },
          { designation: 'Frais de livraison', quantite: 1, prixUnitaire: 5000 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`DEV-${year}-0001`);
    expect(res.body.statut).toBe('brouillon');
    expect(res.body.lignes.length).toBe(2);
    // Ligne 1 : 2 * 10000 = 20000, -10% = 18000 HT, +18% taxe = 21240 TTC
    // Ligne 2 : 1 * 5000 = 5000 HT, 0% taxe = 5000 TTC
    expect(res.body.sousTotal).toBe(23000);
    expect(res.body.totalTaxes).toBeCloseTo(3240, 5);
    expect(res.body.totalTTC).toBeCloseTo(25240, 5); // 23000 + 3240 - 1000 (remise globale)
    quoteId = res.body.id;
  });

  it('incrémente la numérotation pour le devis suivant de la même entreprise', async () => {
    const year = new Date().getFullYear();
    const res = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId });
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`DEV-${year}-0002`);
  });

  it('refuse au rôle readonly de créer un devis', async () => {
    const res = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`)
      .send({ customerId: customerAId });
    expect(res.status).toBe(403);
  });

  it('refuse un contact qui n’appartient pas au client indiqué', async () => {
    const otherCustomer = await request(app)
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Autre client', telephone: '770999999' });

    const res = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: otherCustomer.body.customer.id, contactId: contactAId });
    expect(res.status).toBe(404);
  });

  it('ajoute une ligne à un devis brouillon et recalcule les totaux', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/quotes/${quoteId}/lines`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ designation: 'Option supplémentaire', quantite: 1, prixUnitaire: 2000 });
    expect(res.status).toBe(201);

    const quoteRes = await request(app)
      .get(`/api/v1/crm/quotes/${quoteId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(quoteRes.body.sousTotal).toBe(25000); // 23000 + 2000
    expect(quoteRes.body.lignes.length).toBe(3);
  });

  it('modifie une ligne existante et recalcule les totaux', async () => {
    const quoteRes = await request(app)
      .get(`/api/v1/crm/quotes/${quoteId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    const optionLine = quoteRes.body.lignes.find((l: any) => l.designation === 'Option supplémentaire');

    const res = await request(app)
      .put(`/api/v1/crm/quotes/${quoteId}/lines/${optionLine.id}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ quantite: 3 });
    expect(res.status).toBe(200);
    expect(res.body.totalLigneHT).toBe(6000);
  });

  it('refuse d’envoyer un devis sans aucune ligne', async () => {
    const emptyQuote = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId });

    const res = await request(app)
      .patch(`/api/v1/crm/quotes/${emptyQuote.body.id}/send`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('envoie le devis (brouillon → envoyé)', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/quotes/${quoteId}/send`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('envoye');
  });

  it('refuse de modifier un devis envoyé (lignes verrouillées)', async () => {
    const res = await request(app)
      .put(`/api/v1/crm/quotes/${quoteId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ notes: 'Tentative de modification' });
    expect(res.status).toBe(400);
  });

  it('refuse une transition invalide (brouillon → accepté directement, via un autre devis)', async () => {
    const draft = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId });

    const res = await request(app)
      .patch(`/api/v1/crm/quotes/${draft.body.id}/accept`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('accepte le devis (envoyé → accepté), transition terminale', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/quotes/${quoteId}/accept`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('accepte');

    const again = await request(app)
      .patch(`/api/v1/crm/quotes/${quoteId}/refuse`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(again.status).toBe(400);
  });

  it('liste et filtre les devis par statut', async () => {
    const res = await request(app)
      .get('/api/v1/crm/quotes?statut=accepte')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe(quoteId);
  });

  it('isolation stricte : la numérotation de l’entreprise B repart de 0001', async () => {
    const year = new Date().getFullYear();
    const customerB = await request(app)
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ nom: 'Client B', telephone: '770777777' });

    const res = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ customerId: customerB.body.customer.id });
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`DEV-${year}-0001`);
  });

  it('isolation stricte : l’entreprise B ne voit ni ne modifie les devis de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.body.total).toBe(1); // seulement le sien

    const detailRes = await request(app)
      .get(`/api/v1/crm/quotes/${quoteId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);

    const acceptRes = await request(app)
      .patch(`/api/v1/crm/quotes/${quoteId}/accept`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(acceptRes.status).toBe(404);
  });
});
