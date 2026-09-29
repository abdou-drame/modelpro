import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

let companyAAdminToken: string;
let companyACommercialToken: string;
let companyAStockToken: string;
let companyAStockUserId: number;
let companyBAdminToken: string;

let customerAId: number;
let taskId: number;
let assignedTaskId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Tasks Entreprise A',
    nom: 'Diop', prenom: 'Fatou', telephone: '783000001', password: 'password',
  });
  companyAAdminToken = regA.body.token;

  await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Sarr', prenom: 'Omar', telephone: '783000002', password: 'password', companyRole: 'commercial' });
  const commercialLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '783000002', password: 'password' });
  companyACommercialToken = commercialLogin.body.token;

  const stockMember = await request(app)
    .post('/api/v1/companies/members')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Ba', prenom: 'Kine', telephone: '783000003', password: 'password', companyRole: 'stock' });
  companyAStockUserId = stockMember.body.id;
  const stockLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '783000003', password: 'password' });
  companyAStockToken = stockLogin.body.token;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Tasks Entreprise B',
    nom: 'Fall', prenom: 'Modou', telephone: '783000004', password: 'password',
  });
  companyBAdminToken = regB.body.token;

  const customerRes = await request(app)
    .post('/api/v1/crm/customers')
    .set('Authorization', `Bearer ${companyAAdminToken}`)
    .send({ nom: 'Prospect Tasks', telephone: '770555555' });
  customerAId = customerRes.body.customer.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('CRM — Tâches, relances et rendez-vous', () => {
  it('crée une tâche liée à un prospect (assignation à la création)', async () => {
    const res = await request(app)
      .post('/api/v1/crm/tasks')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({
        type: 'rappel',
        titre: 'Relancer le prospect',
        customerId: customerAId,
        dateEcheance: '2026-10-05T10:00:00.000Z',
      });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('a_faire');
    expect(res.body.dateEcheanceInitiale).toBe(res.body.dateEcheance);
    taskId = res.body.id;
  });

  it('refuse au rôle stock de créer une tâche', async () => {
    const res = await request(app)
      .post('/api/v1/crm/tasks')
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ titre: 'Tâche non autorisée' });
    expect(res.status).toBe(403);
  });

  it('assigne la tâche à un membre stock', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/tasks/${taskId}/assign`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ assignedToUserId: companyAStockUserId });
    expect(res.status).toBe(200);
    expect(res.body.assignedToUserId).toBe(companyAStockUserId);
    assignedTaskId = res.body.id;
  });

  it('permet à l’assigné (rôle stock, non-manager) de reporter sa propre tâche', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/tasks/${assignedTaskId}/reschedule`)
      .set('Authorization', `Bearer ${companyAStockToken}`)
      .send({ dateEcheance: '2026-10-10T10:00:00.000Z', motif: 'Client indisponible' });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('reporte');
    expect(res.body.motifReport).toBe('Client indisponible');
    // La date d'origine reste tracée malgré le report.
    expect(res.body.dateEcheanceInitiale).toBe('2026-10-05T10:00:00.000Z');
    expect(res.body.dateEcheance).toBe('2026-10-10T10:00:00.000Z');
  });

  it('refuse à un membre non assigné et non manager de reporter la tâche d’un autre', async () => {
    const other = await request(app)
      .post('/api/v1/companies/members')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ nom: 'Autre', prenom: 'Membre', telephone: '783000005', password: 'password', companyRole: 'finance' });
    const otherLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '783000005', password: 'password' });

    const res = await request(app)
      .patch(`/api/v1/crm/tasks/${assignedTaskId}/reschedule`)
      .set('Authorization', `Bearer ${otherLogin.body.token}`)
      .send({ dateEcheance: '2026-10-11T10:00:00.000Z' });
    expect(res.status).toBe(403);
    expect(other.status).toBe(201);
  });

  it('termine une tâche (marque comme faite)', async () => {
    const res = await request(app)
      .patch(`/api/v1/crm/tasks/${assignedTaskId}/complete`)
      .set('Authorization', `Bearer ${companyAStockToken}`);
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('fait');
    expect(res.body.dateRealisation).not.toBeNull();
  });

  it('crée un rendez-vous CRM lié à une opportunité', async () => {
    const oppRes = await request(app)
      .post('/api/v1/crm/opportunities')
      .set('Authorization', `Bearer ${companyACommercialToken}`)
      .send({ customerId: customerAId, nom: 'Deal RDV', valeur: 200000 });

    const res = await request(app)
      .post('/api/v1/crm/tasks')
      .set('Authorization', `Bearer ${companyACommercialToken}`)
      .send({
        type: 'rendez_vous',
        titre: 'Présentation produit',
        opportunityId: oppRes.body.id,
        lieu: 'Bureau client',
        dateEcheance: '2026-10-15T09:00:00.000Z',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('rendez_vous');
    expect(res.body.lieu).toBe('Bureau client');
  });

  it('annule une tâche avec motif', async () => {
    const createRes = await request(app)
      .post('/api/v1/crm/tasks')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ titre: 'Tâche à annuler', customerId: customerAId });
    const toCancelId = createRes.body.id;

    const res = await request(app)
      .patch(`/api/v1/crm/tasks/${toCancelId}/cancel`)
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({ motif: 'Prospect plus intéressé' });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('annule');
    expect(res.body.motifAnnulation).toBe('Prospect plus intéressé');
  });

  it('liste les tâches avec filtre par statut et pagination', async () => {
    const res = await request(app)
      .get('/api/v1/crm/tasks?statut=fait')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].id).toBe(assignedTaskId);
  });

  it('récupère le détail d’une tâche avec son client et son opportunité', async () => {
    const res = await request(app)
      .get(`/api/v1/crm/tasks/${taskId}`)
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.customer.nom).toBe('Prospect Tasks');
  });

  it('isolation stricte : l’entreprise B ne voit ni ne modifie les tâches de l’entreprise A', async () => {
    const listRes = await request(app)
      .get('/api/v1/crm/tasks')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.total).toBe(0);

    const detailRes = await request(app)
      .get(`/api/v1/crm/tasks/${taskId}`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(detailRes.status).toBe(404);

    const completeRes = await request(app)
      .patch(`/api/v1/crm/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(completeRes.status).toBe(404);
  });
});
