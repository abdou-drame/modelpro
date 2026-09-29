import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyBAdminToken: string;
let commercialUserId: number;

let productSoldId: number;
let productUnsoldId: number;
let customerAId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Dashboard Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '793000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  const memberRes = await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Sarr', prenom: 'Omar', telephone: '793000002', password: 'password', companyRole: 'commercial' });
  commercialUserId = memberRes.body.id;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Dashboard Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '793000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  // --- Clients : 2 créés, 1 converti (nouveauxClients=2, tauxConversionPct=50%) ---
  const c1 = await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Client Converti', telephone: '770111000' });
  customerAId = c1.body.customer.id;
  await request(app).patch(`/api/v1/crm/customers/${customerAId}/convert`).set('Authorization', `Bearer ${companyAAdminToken}`);

  await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Prospect Restant', telephone: '770111001' });

  // --- Produits : 1 vendu (catégorie Vêtements), 1 jamais vendu ---
  const p1 = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Boubou brodé', categorie: 'Vêtements', prixUnitaire: 10000, tauxTaxe: 18 });
  productSoldId = p1.body.id;

  const p2 = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Article jamais vendu', prixUnitaire: 5000 });
  productUnsoldId = p2.body.id;

  // --- Opportunité ouverte assignée au commercial (pipeline) ---
  await request(app)
    .post('/api/v1/crm/opportunities')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ customerId: customerAId, nom: 'Deal Dashboard', valeur: 100000, probabilite: 50, assignedToUserId: commercialUserId });

  // --- Commande confirmée → facture partiellement payée ---
  const orderRes = await request(app)
    .post('/api/v1/crm/orders')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ customerId: customerAId, lines: [{ productId: productSoldId, quantite: 2 }] });
  await request(app).patch(`/api/v1/crm/orders/${orderRes.body.id}/confirm`).set('Authorization', `Bearer ${companyAAdminToken}`);

  const invoiceRes = await request(app)
    .post(`/api/v1/crm/orders/${orderRes.body.id}/convert-to-invoice`)
    .set('Authorization', `Bearer ${companyAAdminToken}`);
  await request(app)
    .post(`/api/v1/crm/invoices/${invoiceRes.body.id}/payments`)
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ montant: 10000, moyen: 'especes' });

  // --- Stock : entrée + seuil d'alerte déclenché ---
  const sitesRes = await request(app).get('/api/v1/crm/sites').set('Authorization', `Bearer ${companyAAdminToken}`);
  await request(app)
    .post('/api/v1/crm/stock/movements')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ productId: productSoldId, siteId: sitesRes.body[0].id, type: 'entree', quantite: 50, coutUnitaire: 4000 });
  const stockRes = await request(app)
    .get(`/api/v1/crm/stock?productId=${productSoldId}`)
    .set('Authorization', `Bearer ${companyAAdminToken}`);
  await request(app)
    .put(`/api/v1/crm/stock/${stockRes.body.data[0].id}/threshold`)
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ seuilAlerte: 100 });

  // --- Fournisseur + commande envoyée ---
  const supplierRes = await request(app)
    .post('/api/v1/crm/suppliers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Fournisseur Dashboard' });
  const poRes = await request(app)
    .post('/api/v1/crm/purchase-orders')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ supplierId: supplierRes.body.id, lines: [{ designation: 'Tissu', quantite: 1, prixUnitaire: 5000 }] });
  await request(app).patch(`/api/v1/crm/purchase-orders/${poRes.body.id}/send`).set('Authorization', `Bearer ${companyAAdminToken}`);

  // --- Tâche en cours assignée au commercial ---
  await request(app)
    .post('/api/v1/crm/tasks')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ titre: 'Relancer client', assignedToUserId: commercialUserId });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Dashboard de pilotage', () => {
  it('calcule les indicateurs commerciaux (CA, ventes, nouveaux clients, conversion, pipeline)', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);

    const { commercial } = res.body;
    expect(commercial.caMois).toBeCloseTo(23600, 5);
    expect(commercial.caAnnee).toBeCloseTo(23600, 5);
    expect(commercial.nombreVentes).toBe(1);
    expect(commercial.panierMoyen).toBeCloseTo(23600, 5);
    expect(commercial.nouveauxClients).toBe(2);
    expect(commercial.tauxConversionPct).toBeCloseTo(50, 5);
    expect(commercial.pipeline.nombreOpportunitesOuvertes).toBe(1);
    expect(commercial.pipeline.valeurTotale).toBe(100000);
    expect(commercial.pipeline.valeurPonderee).toBe(50000);
  });

  it('calcule les indicateurs financiers (facturé, encaissé, créances, impayés)', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyAAdminToken}`);
    const { finance } = res.body;
    expect(finance.montantFacture).toBeCloseTo(23600, 5);
    expect(finance.montantEncaisse).toBe(10000);
    expect(finance.creances).toBeCloseTo(13600, 5);
    expect(finance.impayesCount).toBe(1);
    expect(finance.paiementsPartielsCount).toBe(1);
  });

  it('calcule le top produits, le chiffre par catégorie et les produits peu actifs', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyAAdminToken}`);
    const { produits } = res.body;

    expect(produits.topVentes[0].productId).toBe(productSoldId);
    expect(produits.topVentes[0].quantiteVendue).toBe(2);
    expect(produits.topVentes[0].ca).toBeCloseTo(20000, 5);

    expect(produits.chiffreParCategorie).toEqual([{ categorie: 'Vêtements', ca: 20000 }]);

    expect(produits.produitsPeuActifs.some((p: any) => p.productId === productUnsoldId)).toBe(true);
    expect(produits.produitsPeuActifs.some((p: any) => p.productId === productSoldId)).toBe(false);
  });

  it('calcule les indicateurs de stock (quantité, valeur, alertes, ruptures)', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyAAdminToken}`);
    const { stocks } = res.body;
    expect(stocks.quantiteTotale).toBe(50);
    expect(stocks.valeurTotale).toBe(200000);
    expect(stocks.alertesCount).toBe(1);
    expect(stocks.rupturesCount).toBe(0);
    expect(stocks.mouvementsPeriode).toBeGreaterThanOrEqual(1);
  });

  it('calcule les indicateurs fournisseurs (achats, commandes en cours, principaux fournisseurs)', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyAAdminToken}`);
    const { fournisseurs } = res.body;
    expect(fournisseurs.achatsPeriode).toBe(5000);
    expect(fournisseurs.commandesEnCoursCount).toBe(1);
    expect(fournisseurs.principauxFournisseurs[0]).toMatchObject({ nom: 'Fournisseur Dashboard', montant: 5000 });
  });

  it('calcule les indicateurs équipe commerciale (opportunités et tâches par commercial)', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyAAdminToken}`);
    const { equipeCommerciale } = res.body;

    const oppCommercial = equipeCommerciale.opportunitesParCommercial.find((o: any) => o.userId === commercialUserId);
    expect(oppCommercial).toMatchObject({ nombre: 1, valeur: 100000 });

    const tachesCommercial = equipeCommerciale.tachesEnCoursParCommercial.find((t: any) => t.userId === commercialUserId);
    expect(tachesCommercial).toMatchObject({ count: 1 });
  });

  it('filtre par période : aucune vente sur un intervalle passé sans données', async () => {
    const res = await request(app)
      .get('/api/v1/crm/dashboard?from=2020-01-01&to=2020-01-31')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.commercial.nombreVentes).toBe(0);
    expect(res.body.finance.montantFacture).toBe(0);
    // les indicateurs "état courant" restent renseignés indépendamment de la période
    expect(res.body.stocks.quantiteTotale).toBe(50);
  });

  it('isolation stricte : le dashboard de l’entreprise B est vide malgré les données de A', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.commercial.nombreVentes).toBe(0);
    expect(res.body.commercial.pipeline.nombreOpportunitesOuvertes).toBe(0);
    expect(res.body.finance.montantFacture).toBe(0);
    expect(res.body.stocks.quantiteTotale).toBe(0);
    expect(res.body.fournisseurs.achatsPeriode).toBe(0);
  });

  it('bloque l’accès sans authentification', async () => {
    const res = await request(app).get('/api/v1/crm/dashboard');
    expect(res.status).toBe(401);
  });
});
