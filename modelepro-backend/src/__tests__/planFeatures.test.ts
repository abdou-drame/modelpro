import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { hashPassword } from '../utils/auth';

jest.setTimeout(30000);

let companyToken: string;
let superToken: string;
let essentielPlanId: number;
let proPlanId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await User.create({
    nom: 'Root', prenom: 'Ataaba', telephone: '700000031', password: await hashPassword('MotDePasse-Staff-1'),
    role: 'ataaba_staff', statut: 'actif', platformRole: 'superadmin',
  });
  superToken = (await request(app).post('/api/v1/auth/login').send({ telephone: '700000031', password: 'MotDePasse-Staff-1' })).body.token;

  const reg = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Palier Entreprise', nom: 'Diop', prenom: 'Fatou', telephone: '797000001', password: 'password',
  });
  companyToken = reg.body.token;

  const plans = await request(app).get('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`);
  essentielPlanId = plans.body.find((p: any) => p.code === 'essentiel').id;
  proPlanId = plans.body.find((p: any) => p.code === 'pro').id;
}, 60000);

afterAll(async () => {
  await sequelize.close();
});

describe('Formules validées par la direction ATAABA (NAATALIX_Formules_Fonctionnalites.docx, 2026-09-24)', () => {
  it('les 4 formules par défaut ont les bons tarifs et quotas', async () => {
    const res = await request(app).get('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`);
    const byCode = (code: string) => res.body.find((p: any) => p.code === code);

    expect(byCode('essentiel')).toMatchObject({ nom: 'Essentiel', prixMensuel: 5000, maxUtilisateurs: 2, maxSites: 1 });
    expect(byCode('pro')).toMatchObject({ nom: 'Pro', prixMensuel: 10000, maxUtilisateurs: 5, maxSites: 2 });
    expect(byCode('business')).toMatchObject({ nom: 'Business', prixMensuel: 20000, maxUtilisateurs: 15, maxSites: 5 });
    expect(byCode('entreprise').maxUtilisateurs).toBeNull();
    expect(byCode('entreprise').maxSites).toBeNull();
  });

  it('une entreprise démarre en essai sur le plan Business (accès complet pendant l’essai)', async () => {
    expect((await request(app).get('/api/v1/crm/stock').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/pipeline-stages').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    const dash = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.produits).not.toBeNull();
    expect(dash.body.equipeCommerciale).not.toBeNull();
  });

  it('Essentiel : la gestion commerciale de base ET les modules de base (Stock, Fournisseurs, Dashboard, Rentabilité) restent accessibles', async () => {
    await request(app).patch(`/api/v1/backoffice/companies/1/subscription/plan`).set('Authorization', `Bearer ${superToken}`).send({ planId: essentielPlanId });
    // "1" est la première entreprise créée dans ce fichier — confirmé par l'enregistrement ci-dessus.
    expect((await request(app).get('/api/v1/crm/customers').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    const create = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${companyToken}`).send({ nom: 'Client Essentiel' });
    expect(create.status).toBe(201);
    expect((await request(app).get('/api/v1/crm/quotes').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);

    // Stock/Fournisseurs/Dashboard/Rentabilité "basique" sont cochés dès l'Essentiel dans le
    // nouveau cahier (contrairement à l'ancien découpage où ils étaient entièrement Pro+).
    expect((await request(app).get('/api/v1/crm/stock').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/suppliers').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/profitability/simulations').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    const dash = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.commercial).not.toBeNull();
    expect(dash.body.commercial.pipeline).toBeUndefined();
  });

  it('Essentiel : pipeline CRM, avoirs, alertes/valorisation stock, rentabilité avancée et dashboard avancé sont refusés (403 FEATURE_NOT_IN_PLAN)', async () => {
    for (const url of [
      '/api/v1/crm/pipeline-stages',
      '/api/v1/crm/opportunities',
      '/api/v1/crm/tasks',
      '/api/v1/crm/stock/alerts',
      '/api/v1/crm/stock/valuation',
      '/api/v1/crm/profitability/simulations/compare',
      '/api/v1/crm/profitability/supplier-comparison',
    ]) {
      const res = await request(app).get(url).set('Authorization', `Bearer ${companyToken}`);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FEATURE_NOT_IN_PLAN');
    }

    // Dashboard reste accessible (200) mais sans les sections avancées / reporting utilisateur.
    const dash = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.produits).toBeNull();
    expect(dash.body.stocks).toBeNull();
    expect(dash.body.fournisseurs).toBeNull();
    expect(dash.body.equipeCommerciale).toBeNull();

    // Écriture bloquée aussi, pas seulement la lecture.
    const write = await request(app).post('/api/v1/crm/pipeline-stages').set('Authorization', `Bearer ${companyToken}`).send({ nom: 'Étape' });
    expect(write.status).toBe(403);
    expect(write.body.code).toBe('FEATURE_NOT_IN_PLAN');
  });

  it('passage au plan Pro : pipeline, avoirs, alertes/valorisation stock, rentabilité avancée et dashboard avancé redeviennent accessibles', async () => {
    const change = await request(app).patch(`/api/v1/backoffice/companies/1/subscription/plan`).set('Authorization', `Bearer ${superToken}`).send({ planId: proPlanId });
    expect(change.status).toBe(200);
    for (const url of ['/api/v1/crm/pipeline-stages', '/api/v1/crm/stock/alerts', '/api/v1/crm/stock/valuation', '/api/v1/crm/profitability/simulations/compare']) {
      expect((await request(app).get(url).set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    }
    const dash = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyToken}`);
    expect(dash.body.produits).not.toBeNull();
    // Reporting par utilisateur reste réservé au Business.
    expect(dash.body.equipeCommerciale).toBeNull();
  });
});

// Verrou de non-régression pour un bug réel : crmRoutes, supplierRoutes, stockRoutes et
// profitabilityRoutes sont montés à des préfixes partagés ou proches (crmRoutes/supplierRoutes/
// stockRoutes tous sur /api/v1/crm). Un premier essai gatait ces modules via un router.use()
// global par routeur, ce qui — via le fallthrough Express entre routeurs partageant un préfixe —
// faisait exécuter le contrôle de fonctionnalité du MAUVAIS module. Masqué jusqu'ici car tous les
// plans de test avaient soit toutes les fonctionnalités, soit aucune. Ces tests utilisent des
// plans asymétriques (une seule fonctionnalité chacun) pour vérifier que chaque module est bien
// gaté par SA PROPRE clé.
describe('Isolation des contrôles de fonctionnalité entre modules partageant /api/v1/crm', () => {
  it('un plan avec uniquement "crm_pipeline" donne accès au pipeline mais pas aux alertes stock / rentabilité avancée', async () => {
    const plan = await request(app).post('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`)
      .send({ code: 'test-pipeline-only', nom: 'Test pipeline only', prixMensuel: 0, prixAnnuel: 0, features: ['crm_pipeline'] });
    await request(app).patch(`/api/v1/backoffice/companies/1/subscription/plan`).set('Authorization', `Bearer ${superToken}`).send({ planId: plan.body.id });

    expect((await request(app).get('/api/v1/crm/pipeline-stages').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/opportunities').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/stock').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200); // base stock : jamais gaté
    expect((await request(app).get('/api/v1/crm/stock/alerts').set('Authorization', `Bearer ${companyToken}`)).status).toBe(403);
    expect((await request(app).get('/api/v1/crm/profitability/simulations/compare').set('Authorization', `Bearer ${companyToken}`)).status).toBe(403);
  });

  it('un plan avec uniquement "stock_alertes" donne accès aux alertes de stock mais pas au pipeline', async () => {
    const plan = await request(app).post('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`)
      .send({ code: 'test-stock-alertes-only', nom: 'Test stock alertes only', prixMensuel: 0, prixAnnuel: 0, features: ['stock_alertes'] });
    await request(app).patch(`/api/v1/backoffice/companies/1/subscription/plan`).set('Authorization', `Bearer ${superToken}`).send({ planId: plan.body.id });

    expect((await request(app).get('/api/v1/crm/stock/alerts').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/suppliers').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200); // base fournisseurs : jamais gaté
    expect((await request(app).get('/api/v1/crm/pipeline-stages').set('Authorization', `Bearer ${companyToken}`)).status).toBe(403);
    expect((await request(app).post('/api/v1/crm/invoices/1/credit-note').set('Authorization', `Bearer ${companyToken}`).send({})).status).toBe(403);
  });

  it('un plan avec uniquement "rentabilite_avancee" donne accès à l’analyse avancée mais pas au pipeline ni aux alertes stock', async () => {
    const plan = await request(app).post('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`)
      .send({ code: 'test-rentabilite-avancee-only', nom: 'Test rentabilite avancee only', prixMensuel: 0, prixAnnuel: 0, features: ['rentabilite_avancee'] });
    await request(app).patch(`/api/v1/backoffice/companies/1/subscription/plan`).set('Authorization', `Bearer ${superToken}`).send({ planId: plan.body.id });

    expect((await request(app).get('/api/v1/crm/profitability/simulations/compare').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/profitability/simulations').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200); // base rentabilité : jamais gaté
    expect((await request(app).get('/api/v1/crm/pipeline-stages').set('Authorization', `Bearer ${companyToken}`)).status).toBe(403);
    expect((await request(app).get('/api/v1/crm/stock/alerts').set('Authorization', `Bearer ${companyToken}`)).status).toBe(403);
  });

  it('un plan avec uniquement "dashboard_avance" donne les sections avancées du dashboard mais pas le pipeline ni les alertes stock', async () => {
    const plan = await request(app).post('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`)
      .send({ code: 'test-dashboard-avance-only', nom: 'Test dashboard avance only', prixMensuel: 0, prixAnnuel: 0, features: ['dashboard_avance'] });
    await request(app).patch(`/api/v1/backoffice/companies/1/subscription/plan`).set('Authorization', `Bearer ${superToken}`).send({ planId: plan.body.id });

    const dash = await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.produits).not.toBeNull();
    expect(dash.body.equipeCommerciale).toBeNull();
    expect((await request(app).get('/api/v1/crm/pipeline-stages').set('Authorization', `Bearer ${companyToken}`)).status).toBe(403);
    expect((await request(app).get('/api/v1/crm/stock/alerts').set('Authorization', `Bearer ${companyToken}`)).status).toBe(403);
  });

  it('la gestion commerciale de base (crmRoutes) reste accessible quel que soit le plan, sans passer par aucun contrôle de fonctionnalité', async () => {
    // Toujours sur le plan "dashboard_avance only" du test précédent : ni pipeline, ni alertes
    // stock — mais customers/quotes ne sont jamais gatés par requireFeature.
    expect((await request(app).get('/api/v1/crm/customers').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/quotes').set('Authorization', `Bearer ${companyToken}`)).status).toBe(200);
  });
});
