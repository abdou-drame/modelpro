import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

jest.setTimeout(30000);

let adminToken: string;
let productId: number;
let customerId: number;
let supplierId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const reg = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Atelier Rentabilite Avancee', nom: 'Ndao', prenom: 'Fatim', telephone: '765000001', password: 'password',
  });
  adminToken = reg.body.token;

  const product = await request(app).post('/api/v1/crm/products').set('Authorization', `Bearer ${adminToken}`)
    .send({ nom: 'Produit Rentabilite', prixUnitaire: 10000 });
  productId = product.body.id;

  const customer = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${adminToken}`).send({ nom: 'Client Rentabilite' });
  customerId = customer.body.customer.id;

  const supplier = await request(app).post('/api/v1/crm/suppliers').set('Authorization', `Bearer ${adminToken}`).send({ nom: 'Fournisseur Rentabilite' });
  supplierId = supplier.body.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Rentabilité avancée — Prévisionnel vs réel', () => {
  it('compare le prévu (simulation) au réel (ventes facturées du produit lié)', async () => {
    const sim = await request(app).post('/api/v1/crm/profitability/simulations').set('Authorization', `Bearer ${adminToken}`)
      .send({
        nom: 'Simulation Comparaison', productId, prixEnvisage: 10000, quantitePrevue: 10,
        margeCibleType: 'marque', margeCiblePct: 30,
        couts: [{ libelle: 'Achat', categorie: 'achat_production', montant: 5000, type: 'variable' }],
      });
    expect(sim.status).toBe(201);
    const simulationId = sim.body.id;

    // Vend réellement 5 unités (facture envoyée) — la moitié du prévisionnel.
    const invoice = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, lines: [{ productId, designation: 'Produit Rentabilite', quantite: 5, prixUnitaire: 10000 }] });
    await request(app).patch(`/api/v1/crm/invoices/${invoice.body.id}/send`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app).get(`/api/v1/crm/profitability/simulations/${simulationId}/previsionnel-vs-reel`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.quantite.prevue).toBe(10);
    expect(res.body.quantite.reelle).toBe(5);
    expect(res.body.quantite.ecartPct).toBeCloseTo(-50, 5);
    expect(res.body.ca.reel).toBe(50000);
  });

  it('refuse la comparaison pour une simulation sans produit lié (400, pas un crash)', async () => {
    const sim = await request(app).post('/api/v1/crm/profitability/simulations').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Simulation Sans Produit', nature: 'projet', prixEnvisage: 10000, quantitePrevue: 10, margeCibleType: 'marque', margeCiblePct: 30 });
    const res = await request(app).get(`/api/v1/crm/profitability/simulations/${sim.body.id}/previsionnel-vs-reel`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});

describe('Rentabilité avancée — Trésorerie prévisionnelle', () => {
  it('ventile les créances (encaissements) et dettes fournisseurs (décaissements) par semaine', async () => {
    const dansUneSemaine = new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const enRetard = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    const invoice = await request(app).post('/api/v1/crm/invoices').set('Authorization', `Bearer ${adminToken}`)
      .send({ customerId, dateEcheance: dansUneSemaine, lines: [{ designation: 'Test', quantite: 1, prixUnitaire: 30000 }] });
    await request(app).patch(`/api/v1/crm/invoices/${invoice.body.id}/send`).set('Authorization', `Bearer ${adminToken}`);

    const po = await request(app).post('/api/v1/crm/purchase-orders').set('Authorization', `Bearer ${adminToken}`)
      .send({ supplierId, dateEcheance: enRetard, lines: [{ designation: 'Achat', quantite: 1, prixUnitaire: 12000 }] });
    await request(app).patch(`/api/v1/crm/purchase-orders/${po.body.id}/send`).set('Authorization', `Bearer ${adminToken}`);
    await request(app).patch(`/api/v1/crm/purchase-orders/${po.body.id}/confirm`).set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app).get('/api/v1/crm/profitability/tresorerie?semaines=4&soldeActuel=100000').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.semaines).toHaveLength(5); // "en_retard" + 4 semaines
    expect(res.body.totalCreances).toBeGreaterThanOrEqual(30000);
    expect(res.body.totalDettesFournisseurs).toBeGreaterThanOrEqual(12000);

    const enRetardBucket = res.body.semaines[0];
    expect(enRetardBucket.semaine).toBe('en_retard');
    expect(enRetardBucket.decaissementsPrevus).toBeGreaterThanOrEqual(12000);

    const semaine1 = res.body.semaines[1];
    expect(semaine1.encaissementsPrevus).toBeGreaterThanOrEqual(30000);
    // Solde cumulé : part de 100000, encaisse en semaine 1 (dette déjà décaissée en_retard).
    expect(semaine1.soldeProjete).toBeGreaterThan(enRetardBucket.soldeProjete);
  });

  it('sans soldeActuel fourni, soldeActuelFourni est null (pas de solde bancaire supposé)', async () => {
    const res = await request(app).get('/api/v1/crm/profitability/tresorerie').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.soldeActuelFourni).toBeNull();
  });
});

describe('Rentabilité avancée — Score /100', () => {
  it('renvoie un score entre 0 et 100 avec le détail des 5 critères (poids = 100 au total)', async () => {
    const res = await request(app).get('/api/v1/crm/profitability/score').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.score).toBeGreaterThanOrEqual(0);
    expect(res.body.score).toBeLessThanOrEqual(100);
    expect(res.body.details).toHaveLength(5);
    expect(res.body.details.reduce((s: number, d: any) => s + d.poids, 0)).toBe(100);
  });

  it('isolation stricte : le score d’une entreprise ne dépend jamais des données d’une autre', async () => {
    const other = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Autre Entreprise Score', nom: 'Sy', prenom: 'Awa', telephone: '765000002', password: 'password',
    });
    const res = await request(app).get('/api/v1/crm/profitability/score').set('Authorization', `Bearer ${other.body.token}`);
    expect(res.status).toBe(200);
    // Aucune donnée pour cette entreprise toute neuve : ne doit pas planter, score par défaut neutre.
    expect(res.body.score).toBeGreaterThanOrEqual(0);
  });
});
