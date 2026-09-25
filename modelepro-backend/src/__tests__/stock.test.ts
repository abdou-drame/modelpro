import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAStockToken: string;
let companyBAdminToken: string;

let siteAId: number;
let productAId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Stock Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '789000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ba', prenom: 'Kine', telephone: '789000002', password: 'password', companyRole: 'stock' });
  const stockLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '789000002', password: 'password' });
  companyAStockToken = stockLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Stock Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '789000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const sitesRes = await request(app).get('/api/v1/crm/sites').set('Authorization', `Bearer ${companyAAdminToken}`);
  siteAId = sitesRes.body[0].id;

  const productRes = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Bobine de fil', prixUnitaire: 1000 });
  productAId = productRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('ERP — Stocks', () => {
  it('un site principal est créé automatiquement à l’inscription', async () => {
    const res = await request(app).get('/api/v1/crm/sites').set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].nom).toBe('Site principal');
    expect(res.body[0].estPrincipal).toBe(true);
  });

  it('enregistre une entrée de stock et met à jour le coût moyen pondéré', async () => {
    const res = await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ productId: productAId, siteId: siteAId, type: 'entree', quantite: 100, coutUnitaire: 500 });
    expect(res.status).toBe(201);
    expect(res.body.item.quantite).toBe(100);
    expect(res.body.item.coutMoyenPondere).toBe(500);
  });

  it('recalcule le coût moyen pondéré sur une deuxième entrée à coût différent', async () => {
    const res = await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ productId: productAId, siteId: siteAId, type: 'entree', quantite: 100, coutUnitaire: 700 });
    expect(res.status).toBe(201);
    // (100*500 + 100*700) / 200 = 600
    expect(res.body.item.quantite).toBe(200);
    expect(res.body.item.coutMoyenPondere).toBe(600);
  });

  it('critère principal : une sortie qui créerait un stock négatif est refusée', async () => {
    const res = await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ productId: productAId, siteId: siteAId, type: 'sortie', quantite: 500 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stock/i);
  });

  it('accepte une sortie qui reste dans les limites du stock disponible', async () => {
    const res = await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ productId: productAId, siteId: siteAId, type: 'sortie', quantite: 50 });
    expect(res.status).toBe(201);
    expect(res.body.item.quantite).toBe(150);
  });

  it('critère principal : un rôle non-admin ne peut pas forcer un stock négatif', async () => {
    const res = await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ productId: productAId, siteId: siteAId, type: 'sortie', quantite: 9999, forcerStockNegatif: true });
    expect(res.status).toBe(400);
  });

  it('critère principal : l’admin peut forcer explicitement un stock négatif', async () => {
    const res = await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ productId: productAId, siteId: siteAId, type: 'sortie', quantite: 9999, forcerStockNegatif: true });
    expect(res.status).toBe(201);
    expect(res.body.item.quantite).toBeLessThan(0);
  });

  it('un inventaire recalcule automatiquement l’écart et journalise le mouvement', async () => {
    const beforeRes = await request(app)
      .get(`/api/v1/crm/stock?productId=${productAId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    const quantiteAvant = beforeRes.body.data[0].quantite;

    const res = await request(app)
      .post('/api/v1/crm/stock/inventaire')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ productId: productAId, siteId: siteAId, quantitePhysique: 100 });
    expect(res.status).toBe(201);
    expect(res.body.movement.type).toBe('inventaire');
    expect(res.body.movement.quantite).toBeCloseTo(100 - quantiteAvant, 5);
    expect(res.body.item.quantite).toBe(100);
  });

  it('définit un seuil d’alerte et le retrouve dans /stock/alerts', async () => {
    const stockRes = await request(app)
      .get(`/api/v1/crm/stock?productId=${productAId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    const itemId = stockRes.body.data[0].id;

    const thresholdRes = await request(app)
      .put(`/api/v1/crm/stock/${itemId}/threshold`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ seuilAlerte: 500 });
    expect(thresholdRes.status).toBe(200);

    const alertsRes = await request(app)
      .get('/api/v1/crm/stock/alerts')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(alertsRes.status).toBe(200);
    expect(alertsRes.body.some((a: any) => a.id === itemId)).toBe(true);
  });

  it('calcule la valorisation simple du stock (quantité × coût moyen pondéré)', async () => {
    const res = await request(app)
      .get('/api/v1/crm/stock/valuation')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.valeurTotale).toBeCloseTo(100 * 600, 5);
  });

  it('l’historique des mouvements est consultable', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/stock/movements?productId=${productAId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(5);
  });

  it('lien achats → stock : la réception d’une commande fournisseur crée une entrée', async () => {
    const supplierRes = await request(app)
      .post('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Fournisseur Stock' });

    const poRes = await request(app)
      .post('/api/v1/crm/purchase-orders')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ supplierId: supplierRes.body.id, lines: [{ productId: productAId, quantite: 20, prixUnitaire: 800 }] });
    await request(app).patch(`/api/v1/crm/purchase-orders/${poRes.body.id}/send`).set('Authorization', `Bearer ${companyAAdminToken}`);

    const beforeRes = await request(app)
      .get(`/api/v1/crm/stock?productId=${productAId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    const quantiteAvant = beforeRes.body.data[0].quantite;

    const receiveRes = await request(app)
      .patch(`/api/v1/crm/purchase-orders/${poRes.body.id}/receive`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(receiveRes.status).toBe(200);

    const afterRes = await request(app)
      .get(`/api/v1/crm/stock?productId=${productAId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(afterRes.body.data[0].quantite).toBe(quantiteAvant + 20);
  });

  it('critère principal : isolation stricte — l’entreprise B ne voit ni ne modifie le stock de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/stock')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.body.total).toBe(0);

    const sitesRes = await request(app).get('/api/v1/crm/sites').set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(sitesRes.body.length).toBe(1);
    expect(sitesRes.body[0].id).not.toBe(siteAId);

    const movementRes = await request(app)
      .post('/api/v1/crm/stock/movements')
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ productId: productAId, siteId: siteAId, type: 'entree', quantite: 10 });
    expect(movementRes.status).toBe(404); // productId appartient à l'entreprise A
  });
});
