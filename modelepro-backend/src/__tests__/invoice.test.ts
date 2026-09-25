import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAReadonlyToken: string;
let companyBAdminToken: string;

let customerAId: number;
let productAId: number;
let manualInvoiceId: number;
let convertedInvoiceId: number;
let confirmedOrderId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Factures Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '787000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ndiaye', prenom: 'Aida', telephone: '787000002', password: 'password', companyRole: 'readonly' });
  const readonlyLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '787000002', password: 'password' });
  companyAReadonlyToken = readonlyLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Factures Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '787000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const customerRes = await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Client Facture', telephone: '770999111' });
  customerAId = customerRes.body.customer.id;

  const productRes = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Prestation complète', prixUnitaire: 100000, tauxTaxe: 18 });
  productAId = productRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('ERP — Facturation et règlements', () => {
  it('crée une facture manuelle avec numérotation FAC-YYYY-0001', async () => {
    const year = new Date().getFullYear();
    const res = await request(app)
      .post('/api/v1/crm/invoices')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, lines: [{ productId: productAId, quantite: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`FAC-${year}-0001`);
    expect(res.body.statut).toBe('brouillon');
    expect(res.body.totalTTC).toBeCloseTo(118000, 5);
    expect(res.body.paymentStatus).toBe('impayee');
    manualInvoiceId = res.body.id;
  });

  it('refuse au rôle readonly de créer une facture', async () => {
    const res = await request(app)
      .post('/api/v1/crm/invoices')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`)
      .send({ customerId: customerAId });
    expect(res.status).toBe(403);
  });

  it('refuse d’enregistrer un règlement sur une facture brouillon', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/invoices/${manualInvoiceId}/payments`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ montant: 10000 });
    expect(res.status).toBe(400);
  });

  it('envoie la facture (brouillon → envoyée)', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/invoices/${manualInvoiceId}/send`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('envoyee');
  });

  it('critère principal : un paiement partiel recalcule correctement le solde et le statut', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/invoices/${manualInvoiceId}/payments`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ montant: 50000, moyen: 'especes' });
    expect(res.status).toBe(201);
    expect(res.body.invoice.montantPaye).toBe(50000);
    expect(res.body.invoice.soldeRestant).toBeCloseTo(68000, 5);
    expect(res.body.invoice.paymentStatus).toBe('partiellement_payee');
  });

  it('critère principal : le paiement du solde termine le recalcul (statut payée, solde à 0)', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/invoices/${manualInvoiceId}/payments`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ montant: 68000, moyen: 'virement', reference: 'VIR-001' });
    expect(res.status).toBe(201);
    expect(res.body.invoice.montantPaye).toBeCloseTo(118000, 5);
    expect(res.body.invoice.soldeRestant).toBe(0);
    expect(res.body.invoice.paymentStatus).toBe('payee');
  });

  it('refuse un règlement qui dépasserait le solde restant (facture déjà payée)', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/invoices/${manualInvoiceId}/payments`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ montant: 1000 });
    expect(res.status).toBe(400);
  });

  it('liste l’historique des règlements de la facture', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/invoices/${manualInvoiceId}/payments`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('refuse d’annuler une facture déjà réglée', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/invoices/${manualInvoiceId}/cancel`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('émet un avoir simple (intégral par défaut) sur la facture réglée', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/invoices/${manualInvoiceId}/credit-note`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('avoir');
    expect(res.body.avoirDeFactureId).toBe(manualInvoiceId);
    expect(res.body.totalTTC).toBeCloseTo(118000, 5);
    expect(res.body.numero).toMatch(/^AV-/);
  });

  it('convertit une commande confirmée en facture sans ressaisie des lignes', async () => {
    const orderRes = await request(app)
      .post('/api/v1/crm/orders')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, lines: [{ productId: productAId, quantite: 2, remisePct: 10 }] });
    await request(app).patch(`/api/v1/crm/orders/${orderRes.body.id}/confirm`).set('Authorization', `Bearer ${companyAAdminToken}`);
    confirmedOrderId = orderRes.body.id;

    const res = await request(app)
      .post(`/api/v1/crm/orders/${confirmedOrderId}/convert-to-invoice`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('envoyee');
    expect(res.body.salesOrderId).toBe(orderRes.body.id);
    expect(res.body.lignes.length).toBe(1);
    expect(res.body.lignes[0].quantite).toBe(2);
    // 2 * 100000 = 200000, -10% = 180000 HT, +18% = 212400 TTC
    expect(res.body.totalTTC).toBeCloseTo(212400, 5);
    convertedInvoiceId = res.body.id;
  });

  it('refuse de refacturer la même commande', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/orders/${confirmedOrderId}/convert-to-invoice`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('calcule un relevé client cohérent (factures, avoir, payé, solde dû)', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/customers/${customerAId}/statement`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    // Facture 1 (118000, payée intégralement) + avoir (118000) + facture convertie (212400, impayée)
    expect(res.body.totalFacture).toBeCloseTo(118000 + 212400, 5);
    expect(res.body.totalAvoir).toBeCloseTo(118000, 5);
    expect(res.body.totalPaye).toBeCloseTo(118000, 5);
    expect(res.body.soldeDu).toBeCloseTo(94400, 5); // (118000+212400) - 118000(avoir) - 118000(payé)
  });

  it('isolation stricte : la numérotation FAC de l’entreprise B repart de 0001', async () => {
    const year = new Date().getFullYear();
    const customerB = await request(app)
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ nom: 'Client B', telephone: '770444333' });

    const res = await request(app)
      .post('/api/v1/crm/invoices')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ customerId: customerB.body.customer.id });
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`FAC-${year}-0001`);
  });

  it('isolation stricte : l’entreprise B ne voit ni ne règle les factures de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/invoices')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.body.total).toBe(1); // seulement la sienne

    const detailRes = await request(app)
      .get(`/api/v1/crm/invoices/${manualInvoiceId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);

    const payRes = await request(app)
      .post(`/api/v1/crm/invoices/${convertedInvoiceId}/payments`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ montant: 1000 });
    expect(payRes.status).toBe(404);
  });
});
