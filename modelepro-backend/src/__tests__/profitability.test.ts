import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAReadonlyToken: string;
let companyBAdminToken: string;

let productAId: number;
let simulationId: number;
let costVariableId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Rentabilite Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '790000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ndiaye', prenom: 'Aida', telephone: '790000002', password: 'password', companyRole: 'readonly' });
  const readonlyLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '790000002', password: 'password' });
  companyAReadonlyToken = readonlyLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Rentabilite Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '790000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const productRes = await request(app)
    .post('/api/v1/crm/products')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Sac en wax', prixUnitaire: 10000 });
  productAId = productRes.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Rentabilité — Simulations', () => {
  it('crée une simulation avec coûts et calcule immédiatement les résultats (exemple §41)', async () => {
    const res = await request(app)
      .post('/api/v1/crm/profitability/simulations')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({
        nom: 'Lancement sac en wax',
        productId: productAId,
        prixEnvisage: 10000,
        margeCibleType: 'marque',
        margeCiblePct: 30,
        quantitePrevue: 100,
        couts: [
          { libelle: 'Achat matière', categorie: 'achat_production', montant: 5000, type: 'variable' },
          { libelle: 'Transport', categorie: 'transport_logistique', montant: 500, type: 'variable' },
          { libelle: 'Emballage', categorie: 'transport_logistique', montant: 200, type: 'variable' },
          { libelle: 'Commission paiement', categorie: 'frais_paiement', montant: 200, type: 'variable' },
          { libelle: 'Marketing', categorie: 'marketing', montant: 300, type: 'variable' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.coutVariableUnitaire).toBe(6200);
    expect(res.body.coutCompletUnitaire).toBe(6200);
    expect(res.body.beneficeUnitaire).toBe(3800);
    expect(res.body.tauxMarque).toBeCloseTo(38, 5);
    expect(res.body.statutRentabilite).toBe('vert'); // 38% >= cible 30%
    expect(res.body.couts.length).toBe(5);
    simulationId = res.body.id;
    costVariableId = res.body.couts[0].id;
  });

  it('refuse au rôle readonly de créer une simulation', async () => {
    const res = await request(app)
      .post('/api/v1/crm/profitability/simulations')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`)
      .send({ nom: 'Interdit', prixEnvisage: 1000 });
    expect(res.status).toBe(403);
  });

  it('permet au rôle readonly de consulter une simulation', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/profitability/simulations/${simulationId}`)
      .set('Authorization', `Bearer ${companyAReadonlyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.nom).toBe('Lancement sac en wax');
  });

  it('ajoute une charge fixe et recalcule automatiquement le coût complet unitaire', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/profitability/simulations/${simulationId}/costs`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ libelle: 'Loyer atelier', categorie: 'rh_fiscal', montant: 100000, type: 'fixe' });
    expect(res.status).toBe(201);

    const simRes = await request(app)
      .get(`/api/v1/crm/profitability/simulations/${simulationId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    // charges fixes 100000 / 100 unités = 1000 de quote-part
    expect(simRes.body.chargesFixesTotales).toBe(100000);
    expect(simRes.body.coutCompletUnitaire).toBe(6200 + 1000);
    expect(simRes.body.beneficeUnitaire).toBe(10000 - 7200);
  });

  it('modifie une ligne de coût et recalcule (toute modification d’hypothèse recalcule les indicateurs)', async () => {
    const res = await request(app)
      .put(`/api/v1/crm/profitability/simulations/${simulationId}/costs/${costVariableId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ montant: 6000 }); // achat matière 5000 → 6000
    expect(res.status).toBe(200);

    const simRes = await request(app)
      .get(`/api/v1/crm/profitability/simulations/${simulationId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(simRes.body.coutVariableUnitaire).toBe(7200); // 6200 + 1000 de plus
  });

  it('modifie le prix envisagé et recalcule le statut de rentabilité', async () => {
    const res = await request(app)
      .put(`/api/v1/crm/profitability/simulations/${simulationId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ prixEnvisage: 8000 });
    expect(res.status).toBe(200);
    expect(res.body.beneficeUnitaire).toBeLessThan(1000);
  });

  it('calcule l’objectif de bénéfice ("je veux gagner X")', async () => {
    // Remet un prix rentable pour ce test.
    await request(app)
      .put(`/api/v1/crm/profitability/simulations/${simulationId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ prixEnvisage: 12000 });

    const res = await request(app)
      .post(`/api/v1/crm/profitability/simulations/${simulationId}/target-profit`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ objectifBenefice: 1000000, periode: 'mois' });
    expect(res.status).toBe(200);
    expect(res.body.ventesNecessaires).toBeGreaterThan(0);
    expect(res.body.caNecessaire).toBeGreaterThan(0);
  });

  it('retourne les 3 scénarios (prudent/réaliste/optimiste)', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/profitability/simulations/${simulationId}/scenarios`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.prudent.quantiteAjustee).toBeLessThan(res.body.realiste.quantiteAjustee);
    expect(res.body.optimiste.quantiteAjustee).toBeGreaterThan(res.body.realiste.quantiteAjustee);
  });

  it('effectue une analyse de sensibilité sur le prix', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/profitability/simulations/${simulationId}/sensitivity`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ parametre: 'prix', variationsPct: [-10, 0, 10] });
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(3);
    expect(res.body.results[0].beneficeUnitaire).toBeLessThan(res.body.results[2].beneficeUnitaire);
  });

  it('simule des remises et signale le passage sous la marge cible', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/profitability/simulations/${simulationId}/discount-simulation`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ tauxRemisePcts: [5, 50] });
    expect(res.status).toBe(200);
    const r50 = res.body.results.find((r: any) => r.tauxRemisePct === 50);
    expect(r50.sousLeSeuilDeRentabilite).toBe(true);
  });

  it('duplique une simulation (copie indépendante)', async () => {
    const res = await request(app)
      .post(`/api/v1/crm/profitability/simulations/${simulationId}/duplicate`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe('Lancement sac en wax (copie)');
    expect(res.body.id).not.toBe(simulationId);
    expect(res.body.couts.length).toBe(6);
  });

  it('archive puis restaure une simulation', async () => {
    const archiveRes = await request(app)
      .patch(`/api/v1/crm/profitability/simulations/${simulationId}/archive`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.statut).toBe('archivee');

    const listActiveRes = await request(app)
      .get('/api/v1/crm/profitability/simulations')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(listActiveRes.body.data.find((s: any) => s.id === simulationId)).toBeUndefined();

    const listArchivedRes = await request(app)
      .get('/api/v1/crm/profitability/simulations?statut=archivee')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(listArchivedRes.body.data.find((s: any) => s.id === simulationId)).toBeDefined();

    const restoreRes = await request(app)
      .patch(`/api/v1/crm/profitability/simulations/${simulationId}/restore`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(restoreRes.status).toBe(200);
    expect(restoreRes.body.statut).toBe('active');
  });

  it('compare plusieurs simulations', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/profitability/simulations')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    const ids = listRes.body.data.map((s: any) => s.id).join(',');

    const res = await request(app)
      .get(`/api/v1/crm/profitability/simulations/compare?ids=${ids}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(listRes.body.data.length);
  });

  it('comparateur fournisseurs réutilise les prix d’achat déjà associés au produit', async () => {
    const s1 = await request(app)
      .post('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Fournisseur Cher' });
    await request(app)
      .post(`/api/v1/crm/suppliers/${s1.body.id}/products`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ productId: productAId, prixAchat: 6000 });

    const s2 = await request(app)
      .post('/api/v1/crm/suppliers')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Fournisseur Avantageux' });
    await request(app)
      .post(`/api/v1/crm/suppliers/${s2.body.id}/products`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ productId: productAId, prixAchat: 4500 });

    const res = await request(app)
      .get(`/api/v1/crm/profitability/supplier-comparison?productId=${productAId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.fournisseurs.length).toBe(2);
    expect(res.body.moinsCher.prixAchat).toBe(4500);
    expect(res.body.moinsCher.supplier.nom).toBe('Fournisseur Avantageux');
  });

  it('isolation stricte : l’entreprise B ne voit ni ne modifie les simulations de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/profitability/simulations')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.body.total).toBe(0);

    const detailRes = await request(app)
      .get(`/api/v1/crm/profitability/simulations/${simulationId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);

    const updateRes = await request(app)
      .put(`/api/v1/crm/profitability/simulations/${simulationId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ prixEnvisage: 1 });
    expect(updateRes.status).toBe(404);
  });
});
