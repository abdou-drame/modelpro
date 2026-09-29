import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyAReadonlyToken: string;
let companyBAdminToken: string;

let customerAId: number;
let stageProspection: number;
let stageGagne: number;
let stagePerdu: number;
let opportunityId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Pipeline Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '782000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ndiaye', prenom: 'Aida', telephone: '782000002', password: 'password', companyRole: 'readonly' });
  const readonlyLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '782000002', password: 'password' });
  companyAReadonlyToken = readonlyLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Pipeline Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '782000003', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const customerRes = await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Prospect Pipeline', telephone: '770444444' });
  customerAId = customerRes.body.customer.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('CRM — Pipeline (étapes) et Opportunités', () => {
  it('crée automatiquement 6 étapes par défaut à l’inscription de l’entreprise', async () => {
    const res = await request(app)
      .get('/api/v1/crm/pipeline-stages')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(6);
    expect(res.body[0].nom).toBe('Prospection');

    stageProspection = res.body.find((s: any) => s.nom === 'Prospection').id;
    stageGagne = res.body.find((s: any) => s.estGagne).id;
    stagePerdu = res.body.find((s: any) => s.estPerdu).id;
  });

  it('ajoute une étape personnalisée (pipeline configurable)', async () => {
    const res = await request(app)
      .post('/api/v1/crm/pipeline-stages')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Relance', ordre: 2.5 });
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe('Relance');
  });

  it('crée une opportunité sur la première étape par défaut', async () => {
    const res = await request(app)
      .post('/api/v1/crm/opportunities')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, nom: 'Vente machines à coudre', valeur: 500000, probabilite: 40 });

    expect(res.status).toBe(201);
    expect(res.body.stageId).toBe(stageProspection);
    expect(res.body.statut).toBe('ouverte');
    opportunityId = res.body.id;
  });

  it('refuse au rôle readonly de créer une opportunité', async () => {
    const res = await request(app)
      .post('/api/v1/crm/opportunities')
      .set('Authorization', `Bearer ${companyAReadonlyToken}`)
      .send({ customerId: customerAId, nom: 'Autre', valeur: 1000 });
    expect(res.status).toBe(403);
  });

  it('borne la probabilité entre 0 et 100', async () => {
    const res = await request(app)
      .post('/api/v1/crm/opportunities')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ customerId: customerAId, nom: 'Probabilité excessive', valeur: 1000, probabilite: 150 });
    expect(res.status).toBe(201);
    expect(res.body.probabilite).toBe(100);
  });

  it('liste les opportunités avec pagination et filtre par étape', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/opportunities?stageId=${stageProspection}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data[0]).toHaveProperty('stage');
    expect(res.body.data[0]).toHaveProperty('customer');
  });

  it('modifie les champs génériques d’une opportunité (prochaine action)', async () => {
    const res = await request(app)
      .put(`/api/v1/crm/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ prochaineAction: 'Envoyer devis', dateProchaineAction: '2026-10-01' });
    expect(res.status).toBe(200);
    expect(res.body.prochaineAction).toBe('Envoyer devis');
  });

  it('calcule la prévision de CA pondérée sur les opportunités ouvertes', async () => {
    const res = await request(app)
      .get('/api/v1/crm/opportunities/forecast')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    // 500000*0.40 + 1000*1.00 = 200000 + 1000 = 201000
    expect(res.body.totalPondere).toBe(201000);
    expect(res.body.nombreOpportunitesOuvertes).toBe(2);
  });

  it('déplace une opportunité vers l’étape "Gagné" : statut et dateCloture se mettent à jour automatiquement', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/opportunities/${opportunityId}/stage`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ stageId: stageGagne });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('gagnee');
    expect(res.body.dateCloture).not.toBeNull();
  });

  it('l’opportunité gagnée sort du calcul de prévision (qui ne porte que sur les opportunités ouvertes)', async () => {
    const res = await request(app)
      .get('/api/v1/crm/opportunities/forecast')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.nombreOpportunitesOuvertes).toBe(1);
  });

  it('refuse de supprimer une étape encore utilisée par une opportunité', async () => {
    const res = await request(app)
      .delete(`/api/v1/crm/pipeline-stages/${stageGagne}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(400);
  });

  it('supprime une étape non utilisée', async () => {
    const res = await request(app)
      .delete(`/api/v1/crm/pipeline-stages/${stagePerdu}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
  });

  it('isolation stricte : l’entreprise B ne voit ni les étapes ni les opportunités de l’entreprise A', async () => {
    const stagesRes = await request(app)
      .get('/api/v1/crm/pipeline-stages')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(stagesRes.status).toBe(200);
    expect(stagesRes.body.length).toBe(6); // ses propres étapes par défaut, pas celles de A

    const oppRes = await request(app)
      .get('/api/v1/crm/opportunities')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(oppRes.status).toBe(200);
    expect(oppRes.body.total).toBe(0);

    const detailRes = await request(app)
      .get(`/api/v1/crm/opportunities/${opportunityId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);
  });

  it('isolation stricte : l’entreprise B ne peut pas déplacer une opportunité de l’entreprise A', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/opportunities/${opportunityId}/stage`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ stageId: stageProspection });
    expect(res.status).toBe(404);
  });

  it('la prévision de CA de l’entreprise B est vide (aucune fuite de données de A)', async () => {
    const res = await request(app)
      .get('/api/v1/crm/opportunities/forecast')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalPondere).toBe(0);
  });
});
