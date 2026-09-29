import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAStockToken: string;
let companyACommercialToken: string;
let companyBAdminToken: string;

let supplierAId: number;
let contactAId: number;
let productAId: number;
let purchaseOrderId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Achats Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '788000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ba', prenom: 'Kine', telephone: '788000002', password: 'password', companyRole: 'stock' });
  const stockLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '788000002', password: 'password' });
  companyAStockToken = stockLogin.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Sarr', prenom: 'Omar', telephone: '788000003', password: 'password', companyRole: 'commercial' });
  const commercialLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '788000003', password: 'password' });
  companyACommercialToken = commercialLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Achats Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '788000004', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const productRes = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Tissu wax', prixUnitaire: 5000, tauxTaxe: 18 });
  productAId = productRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('ERP — Fournisseurs et achats', () => {
  it('crée un fournisseur (rôle stock autorisé)', async () => {
    const res = await request(app)
      .post('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ nom: 'Textiles du Sénégal', telephone: '338001122', conditionsPaiement: '30 jours net' });
    expect(res.status).toBe(201);
    supplierAId = res.body.id;
  });

  it('refuse au rôle commercial de créer un fournisseur (module réservé admin/manager/stock)', async () => {
    const res = await request(app)
      .post('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyACommercialToken}`)
      .send({ nom: 'Interdit' });
    expect(res.status).toBe(403);
  });

  it('ajoute un contact fournisseur', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/suppliers/${supplierAId}/contacts`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Kane', prenom: 'Ousmane', fonction: 'Commercial' });
    expect(res.status).toBe(201);
    contactAId = res.body.id;
  });

  it('associe un produit fourni avec prix d’achat et conditions', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/suppliers/${supplierAId}/products`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ productId: productAId, prixAchat: 3000, referenceFournisseur: 'WAX-01', delaiLivraison: '7 jours' });
    expect(res.status).toBe(201);
    expect(res.body.prixAchat).toBe(3000);
  });

  it('refuse d’associer deux fois le même produit au même fournisseur', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/suppliers/${supplierAId}/products`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ productId: productAId, prixAchat: 3200 });
    expect(res.status).toBe(400);
  });

  it('crée une commande fournisseur avec numérotation ACH-YYYY-0001', async () => {
    const year = new Date().getFullYear();
    const res = await request(app)
      .post('/api/v1/crm/purchase-orders')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({
        supplierId: supplierAId,
        contactId: contactAId,
        lines: [{ productId: productAId, quantite: 10, prixUnitaire: 3000 }],
      });
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`ACH-${year}-0001`);
    expect(res.body.statut).toBe('brouillon');
    expect(res.body.totalTTC).toBeCloseTo(35400, 5); // 10*3000=30000 HT, +18%=35400
    purchaseOrderId = res.body.id;
  });

  it('suit le cycle : envoyer → confirmer → recevoir', async () => {
    const sendRes = await request(app)
      .patch(`/api/v1/crm/purchase-orders/${purchaseOrderId}/send`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(sendRes.status).toBe(200);
    expect(sendRes.body.statut).toBe('envoyee');

    const confirmRes = await request(app)
      .patch(`/api/v1/crm/purchase-orders/${purchaseOrderId}/confirm`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.statut).toBe('confirmee');

    const receiveRes = await request(app)
      .patch(`/api/v1/crm/purchase-orders/${purchaseOrderId}/receive`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(receiveRes.status).toBe(200);
    expect(receiveRes.body.statut).toBe('recue');
  });

  it('critère principal : l’historique de la commande est consultable', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/purchase-orders/${purchaseOrderId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    const statuts = res.body.historiqueStatuts.map((h: any) => h.statut);
    expect(statuts).toEqual(['brouillon', 'envoyee', 'confirmee', 'recue']);
  });

  it('enregistre un règlement partiel vers le fournisseur et recalcule le solde', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/purchase-orders/${purchaseOrderId}/payments`)
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ montant: 20000, moyen: 'virement' });
    expect(res.status).toBe(201);
    expect(res.body.order.montantPaye).toBe(20000);
    expect(res.body.order.soldeRestant).toBeCloseTo(15400, 5);
  });

  it('refuse un règlement qui dépasserait le solde restant', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/purchase-orders/${purchaseOrderId}/payments`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ montant: 999999 });
    expect(res.status).toBe(400);
  });

  it('calcule un solde fournisseur cohérent (statement)', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/suppliers/${supplierAId}/statement`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalAchats).toBeCloseTo(35400, 5);
    expect(res.body.totalPaye).toBe(20000);
    expect(res.body.soldeDu).toBeCloseTo(15400, 5);
  });

  it('critère principal : isolation stricte — la numérotation ACH de l’entreprise B repart de 0001', async () => {
    const year = new Date().getFullYear();
    const supplierB = await request(app)
      .post('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ nom: 'Fournisseur B' });

    const res = await request(app)
      .post('/api/v1/crm/purchase-orders')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ supplierId: supplierB.body.id });
    expect(res.status).toBe(201);
    expect(res.body.numero).toBe(`ACH-${year}-0001`);
  });

  it('critère principal : isolation stricte — l’entreprise B ne voit ni ne règle les commandes fournisseur de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/purchase-orders')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.body.total).toBe(1); // seulement la sienne

    const detailRes = await request(app)
      .get(`/api/v1/crm/purchase-orders/${purchaseOrderId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);

    const payRes = await request(app)
      .post(`/api/v1/crm/purchase-orders/${purchaseOrderId}/payments`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ montant: 1000 });
    expect(payRes.status).toBe(404);

    const supplierListRes = await request(app)
      .get('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(supplierListRes.body.total).toBe(1); // seulement le sien
  });
});
