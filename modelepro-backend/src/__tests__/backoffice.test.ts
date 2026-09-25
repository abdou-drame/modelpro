import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { CompanySubscription } from '../models/CompanySubscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Notification } from '../models/Notification';
import { hashPassword } from '../utils/auth';
import { runSubscriptionMaintenance } from '../services/subscriptionService';

let superToken: string;
let supportToken: string;
let readonlyToken: string;
let companyAToken: string;
let companyAId: number;
let companyAAdminId: number;
let companyBToken: string;
let companyBId: number;
let modeleProClientToken: string;
let staffSupportId: number;

const login = async (telephone: string) => {
  const res = await request(app).post('/api/v1/auth/login').send({ telephone, password: 'MotDePasse-Staff-1' });
  return res.body.token as string;
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  await User.create({
    nom: 'Root', prenom: 'Ataaba', telephone: '700000001', password: await hashPassword('MotDePasse-Staff-1'),
    role: 'ataaba_staff', statut: 'actif', platformRole: 'superadmin',
  });
  superToken = await login('700000001');

  const support = await request(app).post('/api/v1/backoffice/staff').set('Authorization', `Bearer ${superToken}`)
    .send({ nom: 'Sup', prenom: 'Port', telephone: '700000002', password: 'MotDePasse-Staff-1', platformRole: 'support' });
  staffSupportId = support.body.id;
  await request(app).post('/api/v1/backoffice/staff').set('Authorization', `Bearer ${superToken}`)
    .send({ nom: 'Read', prenom: 'Only', telephone: '700000003', password: 'MotDePasse-Staff-1', platformRole: 'readonly' });
  supportToken = await login('700000002');
  readonlyToken = await login('700000003');

  const regA = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Societe Alpha', nom: 'Diop', prenom: 'Fatou', telephone: '794000001', password: 'password',
  });
  companyAToken = regA.body.token;
  companyAId = regA.body.company.id;
  companyAAdminId = regA.body.user.id;

  const regB = await request(app).post('/api/v1/companies/register').send({
    companyNom: 'Societe Beta', nom: 'Fall', prenom: 'Modou', telephone: '794000002', password: 'password',
  });
  companyBToken = regB.body.token;
  companyBId = regB.body.company.id;

  const client = await request(app).post('/api/v1/auth/register').send({
    nom: 'Client', prenom: 'Mp', telephone: '794000003', password: 'password', role: 'client',
  });
  modeleProClientToken = client.body.token;
}, 60000);

afterAll(async () => {
  await sequelize.close();
});

jest.setTimeout(30000);

describe('Sécurité de l’inscription publique', () => {
  it('refuse et ne crée aucun compte pour un rôle privilégié passé à /auth/register', async () => {
    for (const role of ['ataaba_staff', 'admin', 'entreprise']) {
      const res = await request(app).post('/api/v1/auth/register').send({
        nom: 'Pirate', prenom: 'X', telephone: `79499${role.length}`, password: 'password', role,
      });
      expect(res.status).toBe(400);
      expect(await User.count({ where: { telephone: `79499${role.length}` } })).toBe(0);
    }
  });
});

describe('Back-office ATAABA — contrôle d’accès', () => {
  it('refuse sans token (401), avec un compte entreprise ou ModèlePro (403)', async () => {
    expect((await request(app).get('/api/v1/backoffice/companies')).status).toBe(401);
    expect((await request(app).get('/api/v1/backoffice/companies').set('Authorization', `Bearer ${companyAToken}`)).status).toBe(403);
    expect((await request(app).get('/api/v1/backoffice/companies').set('Authorization', `Bearer ${modeleProClientToken}`)).status).toBe(403);
  });

  it('respecte les rôles plateforme (readonly/support/superadmin)', async () => {
    expect((await request(app).get('/api/v1/backoffice/companies').set('Authorization', `Bearer ${readonlyToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/v1/backoffice/companies/${companyAId}/members`).set('Authorization', `Bearer ${readonlyToken}`)).status).toBe(403);
    expect((await request(app).get(`/api/v1/backoffice/companies/${companyAId}/members`).set('Authorization', `Bearer ${supportToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/v1/backoffice/companies/${companyAId}/suspend`).set('Authorization', `Bearer ${supportToken}`).send({})).status).toBe(403);
    expect((await request(app).get('/api/v1/backoffice/audit-logs').set('Authorization', `Bearer ${supportToken}`)).status).toBe(403);
    expect((await request(app).post('/api/v1/backoffice/plans').set('Authorization', `Bearer ${supportToken}`).send({ code: 'x', nom: 'X' })).status).toBe(403);
  });

  it('un membre du personnel suspendu perd l’accès immédiatement (token encore valide)', async () => {
    await request(app).patch(`/api/v1/backoffice/staff/${staffSupportId}/status`).set('Authorization', `Bearer ${superToken}`).send({ statut: 'suspendu' });
    expect((await request(app).get('/api/v1/backoffice/companies').set('Authorization', `Bearer ${supportToken}`)).status).toBe(403);
    await request(app).patch(`/api/v1/backoffice/staff/${staffSupportId}/status`).set('Authorization', `Bearer ${superToken}`).send({ statut: 'actif' });
    expect((await request(app).get('/api/v1/backoffice/companies').set('Authorization', `Bearer ${supportToken}`)).status).toBe(200);
  });

  it('un superadmin ne peut pas suspendre son propre compte', async () => {
    const list = await request(app).get('/api/v1/backoffice/staff').set('Authorization', `Bearer ${superToken}`);
    const self = list.body.find((s: any) => s.platformRole === 'superadmin');
    const res = await request(app).patch(`/api/v1/backoffice/staff/${self.id}/status`).set('Authorization', `Bearer ${superToken}`).send({ statut: 'suspendu' });
    expect(res.status).toBe(400);
  });
});

describe('Back-office ATAABA — supervision des entreprises', () => {
  it('liste les entreprises avec leur abonnement d’essai créé à l’inscription', async () => {
    const res = await request(app).get('/api/v1/backoffice/companies').set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    const alpha = res.body.data.find((c: any) => c.nom === 'Societe Alpha');
    expect(alpha.abonnement.statutEffectif).toBe('essai');
    expect(alpha.abonnement.plan.code).toBe('business');
  });

  it('filtre par statut d’abonnement et par nom', async () => {
    const res = await request(app).get('/api/v1/backoffice/companies?search=alpha&statutAbonnement=essai').set('Authorization', `Bearer ${superToken}`);
    expect(res.body.total).toBe(1);
  });

  it('détail entreprise : métriques d’usage (compteurs) sans contenu métier, et accès journalisé', async () => {
    await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${companyAToken}`).send({ nom: 'Client secret' });
    const res = await request(app).get(`/api/v1/backoffice/companies/${companyAId}`).set('Authorization', `Bearer ${superToken}`);
    expect(res.status).toBe(200);
    expect(res.body.usage.clients).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain('Client secret');

    const logs = await request(app).get(`/api/v1/backoffice/audit-logs?companyId=${companyAId}&action=company.view`).set('Authorization', `Bearer ${superToken}`);
    expect(logs.body.total).toBeGreaterThanOrEqual(1);
    expect(logs.body.data[0].actorType).toBe('staff');
  });

  it('statistiques globales', async () => {
    const res = await request(app).get('/api/v1/backoffice/stats').set('Authorization', `Bearer ${readonlyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.entreprises).toBe(2);
    expect(res.body.abonnementsParStatut.essai).toBe(2);
  });
});

describe('Abonnements — suspension, expiration, renouvellement', () => {
  it('suspension : lecture conservée, écriture bloquée (402), autres entreprises non affectées', async () => {
    const suspend = await request(app).patch(`/api/v1/backoffice/companies/${companyAId}/suspend`)
      .set('Authorization', `Bearer ${superToken}`).send({ motif: 'Impayé' });
    expect(suspend.status).toBe(200);

    const write = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${companyAToken}`).send({ nom: 'Nouveau' });
    expect(write.status).toBe(402);
    expect(write.body.code).toBe('SUBSCRIPTION_INACTIVE');

    expect((await request(app).get('/api/v1/crm/customers').set('Authorization', `Bearer ${companyAToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/customers/export').set('Authorization', `Bearer ${companyAToken}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/crm/dashboard').set('Authorization', `Bearer ${companyAToken}`)).status).toBe(200);
    expect((await request(app).post('/api/v1/auth/login').send({ telephone: '794000001', password: 'password' })).status).toBe(200);

    const other = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${companyBToken}`).send({ nom: 'B ok' });
    expect(other.status).toBe(201);
  });

  it('réactivation : les écritures reprennent', async () => {
    await request(app).patch(`/api/v1/backoffice/companies/${companyAId}/reactivate`).set('Authorization', `Bearer ${superToken}`);
    const write = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${companyAToken}`).send({ nom: 'Reprise' });
    expect(write.status).toBe(201);
  });

  it('essai échu : lecture seule immédiate, puis le job persiste l’expiration et notifie l’admin', async () => {
    await CompanySubscription.update({ dateFinEssai: new Date(Date.now() - 24 * 3600 * 1000) }, { where: { companyId: companyAId } });

    const write = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${companyAToken}`).send({ nom: 'Trop tard' });
    expect(write.status).toBe(402);

    const result = await runSubscriptionMaintenance();
    expect(result.expired).toBe(1);
    const sub = await CompanySubscription.findOne({ where: { companyId: companyAId } });
    expect(sub!.statut).toBe('expire');
    expect(await Notification.count({ where: { userId: companyAAdminId, type: 'paiement' } })).toBeGreaterThanOrEqual(1);

    const again = await runSubscriptionMaintenance();
    expect(again.expired).toBe(0);
  });

  it('renouvellement : réactive et fixe la fin de période', async () => {
    const res = await request(app).post(`/api/v1/backoffice/companies/${companyAId}/subscription/renew`)
      .set('Authorization', `Bearer ${superToken}`).send({ cycle: 'annuel' });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('actif');
    expect(new Date(res.body.dateFinPeriode).getTime()).toBeGreaterThan(Date.now() + 360 * 24 * 3600 * 1000);

    const write = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${companyAToken}`).send({ nom: 'Renouvelé' });
    expect(write.status).toBe(201);
  });

  it('alerte 3 jours avant l’échéance, une seule fois', async () => {
    await CompanySubscription.update({ dateFinPeriode: new Date(Date.now() + 2 * 24 * 3600 * 1000), alerteExpirationEnvoyee: false }, { where: { companyId: companyAId } });
    const before = await Notification.count({ where: { userId: companyAAdminId } });
    const first = await runSubscriptionMaintenance();
    expect(first.alerted).toBe(1);
    expect(await Notification.count({ where: { userId: companyAAdminId } })).toBe(before + 1);
    expect((await runSubscriptionMaintenance()).alerted).toBe(0);
  });

  it('prolongation d’essai', async () => {
    const res = await request(app).post(`/api/v1/backoffice/companies/${companyBId}/trial/extend`)
      .set('Authorization', `Bearer ${superToken}`).send({ jours: 10 });
    expect(res.status).toBe(200);
    const bad = await request(app).post(`/api/v1/backoffice/companies/${companyBId}/trial/extend`)
      .set('Authorization', `Bearer ${superToken}`).send({ jours: 500 });
    expect(bad.status).toBe(400);
  });

  it('historique des changements d’abonnement conservé', async () => {
    const res = await request(app).get(`/api/v1/backoffice/companies/${companyAId}/subscription/history`).set('Authorization', `Bearer ${readonlyToken}`);
    const types = res.body.map((e: any) => e.type);
    expect(types).toEqual(expect.arrayContaining(['creation', 'suspension', 'reactivation', 'expiration', 'renouvellement']));
  });
});

describe('Plans et quotas', () => {
  it('le superadmin crée et modifie un plan', async () => {
    const created = await request(app).post('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`)
      .send({ code: 'mini', nom: 'Mini', prixMensuel: 5000, prixAnnuel: 50000, maxUtilisateurs: 2, maxSites: 1, features: ['stock'] });
    expect(created.status).toBe(201);
    const dup = await request(app).post('/api/v1/backoffice/plans').set('Authorization', `Bearer ${superToken}`).send({ code: 'mini', nom: 'Mini bis' });
    expect(dup.status).toBe(400);
    const updated = await request(app).put(`/api/v1/backoffice/plans/${created.body.id}`).set('Authorization', `Bearer ${superToken}`).send({ prixMensuel: 6000 });
    expect(updated.body.prixMensuel).toBe(6000);
  });

  it('quota utilisateurs : l’ajout au-delà du plan est refusé (403 QUOTA_EXCEEDED)', async () => {
    const mini = await SubscriptionPlan.findOne({ where: { code: 'mini' } });
    const change = await request(app).patch(`/api/v1/backoffice/companies/${companyBId}/subscription/plan`)
      .set('Authorization', `Bearer ${superToken}`).send({ planId: mini!.id });
    expect(change.status).toBe(200);

    const ok = await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${companyBToken}`)
      .send({ nom: 'M', prenom: 'Un', telephone: '794100001', password: 'password', companyRole: 'commercial' });
    expect(ok.status).toBe(201); // 2/2
    const refused = await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${companyBToken}`)
      .send({ nom: 'M', prenom: 'Deux', telephone: '794100002', password: 'password', companyRole: 'commercial' });
    expect(refused.status).toBe(403);
    expect(refused.body.code).toBe('QUOTA_EXCEEDED');
  });

  it('quota sites : un seul site autorisé (le site principal) sur le plan mini', async () => {
    const res = await request(app).post('/api/v1/crm/sites').set('Authorization', `Bearer ${companyBToken}`).send({ nom: 'Second site' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('QUOTA_EXCEEDED');
  });

  it('refuse de passer à un plan plus petit que le nombre d’utilisateurs actifs', async () => {
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${companyAToken}`)
        .send({ nom: 'A', prenom: `M${i}`, telephone: `79420000${i}`, password: 'password', companyRole: 'readonly' });
    }
    const mini = await SubscriptionPlan.findOne({ where: { code: 'mini' } });
    const res = await request(app).patch(`/api/v1/backoffice/companies/${companyAId}/subscription/plan`)
      .set('Authorization', `Bearer ${superToken}`).send({ planId: mini!.id });
    expect(res.status).toBe(400);
  });
});

describe('Journal d’audit', () => {
  it('trace les actions sensibles du back-office (acteur, action, objet, résultat)', async () => {
    const res = await request(app).get('/api/v1/backoffice/audit-logs?limit=100').set('Authorization', `Bearer ${superToken}`);
    const actions = res.body.data.map((l: any) => l.action);
    expect(actions).toEqual(expect.arrayContaining(['staff.create', 'staff.status', 'company.suspend', 'company.reactivate', 'subscription.renew', 'plan.create', 'subscription.plan_change']));
    expect(res.body.data[0]).toHaveProperty('actorUserId');
    expect(res.body.data[0].resultat).toBe('succes');
  });
});
