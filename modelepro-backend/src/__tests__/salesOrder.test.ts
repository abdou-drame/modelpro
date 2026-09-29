import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAReadonlyToken: string;
let companyBAdminToken: string;

let customerAId: number;
let productAId: number;
let manualOrderId: number;
let acceptedQuoteId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Commandes Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '786000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ndiaye', prenom: 'Aida', telephone: '786000002', password: 'password', companyRole: 'readonly' });
  const readonlyLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '786000002', password: 'password' });
  companyAReadonlyToken = readonlyLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Commandes Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '786000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const customerRes = await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Client Commande', telephone: '770666666' });
  customerAId = customerRes.body.customer.id;

  const productRes = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ensemble traditionnel', prixUnitaire: 30000, tauxTaxe: 18 });
  productAId = productRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('ERP — Commandes commerciales', () => {
  it('crée une commande manuelle avec numérotation CMD-YYYY-0001', async () => {
    const year = new Date().getFullYear();
    const res = await request(app)
      .post('/api/v1/crm/orders')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, lines: [{ productId: productAId, quantite: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`CMD-${year}-0001`);
    expect(res.body.statut).toBe('brouillon');
    expect(res.body.totalTTC).toBeCloseTo(35400, 5); // 30000 * 1.18
    manualOrderId = res.body.id;
  });

  it('refuse au rôle readonly de créer une commande', async () => {
    const res = await request(app)
      .post('/api/v1/crm/orders')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`)
      .send({ customerId: customerAId });
    expect(res.status).toBe(403);
  });

  it('suit le cycle de statuts complet : confirmer → préparer → livrer', async () => {
    // La livraison crée une sortie de stock (lien ventes → stock, module Stocks) : on
    // approvisionne d'abord le produit pour que la sortie ne soit pas bloquée par le contrôle de
    // stock négatif.
    const sitesRes = await request(app)
      .get('/api/v1/crm/sites')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    const siteId = sitesRes.body[0].id;
    await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ productId: productAId, siteId, type: 'entree', quantite: 5, coutUnitaire: 20000 });

    const confirmRes = await request(app)
      .patch(`/api/v1/crm/orders/${manualOrderId}/confirm`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.statut).toBe('confirmee');

    const prepRes = await request(app)
      .patch(`/api/v1/crm/orders/${manualOrderId}/start-preparation`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(prepRes.status).toBe(200);
    expect(prepRes.body.statut).toBe('en_preparation');

    const deliverRes = await request(app)
      .patch(`/api/v1/crm/orders/${manualOrderId}/deliver`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.statut).toBe('livree');

    const stockRes = await request(app)
      .get(`/api/v1/crm/stock?productId=${productAId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(stockRes.body.data[0].quantite).toBe(4); // 5 reçus - 1 livré
  });

  it('trace l’historique des transitions de statut', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/orders/${manualOrderId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    const statuts = res.body.historiqueStatuts.map((h: any) => h.statut);
    expect(statuts).toEqual(['brouillon', 'confirmee', 'en_preparation', 'livree']);
  });

  it('refuse une transition invalide (livrée → confirmée)', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/orders/${manualOrderId}/confirm`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('refuse de modifier une commande qui n’est plus en brouillon', async () => {
    const res = await request(app)
      .put(`/api/v1/crm/orders/${manualOrderId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ notes: 'Trop tard' });
    expect(res.status).toBe(400);
  });

  it('annule une commande brouillon', async () => {
    const draft = await request(app)
      .post('/api/v1/crm/orders')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId });

    const res = await request(app)
      .patch(`/api/v1/crm/orders/${draft.body.id}/cancel`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('annulee');
  });

  it('convertit un devis accepté en commande sans ressaisie des lignes', async () => {
    const quoteRes = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({
        customerId: customerAId,
        lines: [{ productId: productAId, quantite: 2, remisePct: 5 }],
      });
    acceptedQuoteId = quoteRes.body.id;

    await request(app).patch(`/api/v1/crm/quotes/${acceptedQuoteId}/send`).set('Authorization', `Bearer ${companyAAdminToken}`);
    await request(app).patch(`/api/v1/crm/quotes/${acceptedQuoteId}/accept`).set('Authorization', `Bearer ${companyAAdminToken}`);

    const res = await request(app)
      .post(`/api/v1/crm/quotes/${acceptedQuoteId}/convert-to-order`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);

    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('confirmee');
    expect(res.body.quoteId).toBe(acceptedQuoteId);
    expect(res.body.customerId).toBe(customerAId);
    expect(res.body.lignes.length).toBe(1);
    expect(res.body.lignes[0].productId).toBe(productAId);
    expect(res.body.lignes[0].quantite).toBe(2);
    expect(res.body.lignes[0].remisePct).toBe(5);
    // 2 * 30000 = 60000, -5% = 57000 HT, +18% = 67260 TTC
    expect(res.body.totalTTC).toBeCloseTo(67260, 5);
  });

  it('refuse de reconvertir le même devis (déjà converti)', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/quotes/${acceptedQuoteId}/convert-to-order`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('refuse de convertir un devis non accepté', async () => {
    const draftQuote = await request(app)
      .post('/api/v1/crm/quotes')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, lines: [{ productId: productAId, quantite: 1 }] });

    const res = await request(app)
      .post(`/api/v1/crm/quotes/${draftQuote.body.id}/convert-to-order`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('liste et filtre les commandes par statut', async () => {
    const res = await request(app)
      .get('/api/v1/crm/orders?statut=confirmee')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('isolation stricte : la numérotation de commande de l’entreprise B repart de 0001', async () => {
    const year = new Date().getFullYear();
    const customerB = await request(app)
      .post('/api/v1/crm/customers')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ nom: 'Client B', telephone: '770333222' });

    const res = await request(app)
      .post('/api/v1/crm/orders')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ customerId: customerB.body.customer.id });
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`CMD-${year}-0001`);
  });

  it('isolation stricte : l’entreprise B ne voit ni ne modifie les commandes de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/orders')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.body.total).toBe(1); // seulement la sienne

    const detailRes = await request(app)
      .get(`/api/v1/crm/orders/${manualOrderId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);

    const cancelRes = await request(app)
      .patch(`/api/v1/crm/orders/${manualOrderId}/cancel`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(cancelRes.status).toBe(404);
  });
});
