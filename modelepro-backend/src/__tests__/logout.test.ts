import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';

jest.setTimeout(30000);

describe('Déconnexion serveur (Phase 5) — sessionVersion', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('logout invalide le jeton courant ; une reconnexion émet un nouveau jeton valide, définitivement distinct de l’ancien', async () => {
    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Logout', nom: 'Fall', prenom: 'Mor', telephone: '730000001', password: 'password',
    });
    const firstToken = reg.body.token;
    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${firstToken}`)).status).toBe(200);

    const logoutRes = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${firstToken}`);
    expect(logoutRes.status).toBe(200);
    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${firstToken}`)).status).toBe(401);

    const login = await request(app).post('/api/v1/auth/login').send({ telephone: '730000001', password: 'password' });
    const secondToken = login.body.token;
    expect(secondToken).toBeTruthy();
    expect(secondToken).not.toBe(firstToken);
    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${secondToken}`)).status).toBe(200);

    // L'ancien jeton reste invalide définitivement, même après une reconnexion réussie.
    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${firstToken}`)).status).toBe(401);
  });

  it('logout invalide TOUS les jetons existants (tous les appareils), pas seulement celui utilisé pour se déconnecter', async () => {
    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Multi-Appareils', nom: 'Cisse', prenom: 'Awa', telephone: '730000002', password: 'password',
    });
    const deviceA = reg.body.token;
    const loginB = await request(app).post('/api/v1/auth/login').send({ telephone: '730000002', password: 'password' });
    const deviceB = loginB.body.token;

    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${deviceA}`)).status).toBe(200);
    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${deviceB}`)).status).toBe(200);

    await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${deviceA}`);

    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${deviceA}`)).status).toBe(401);
    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${deviceB}`)).status).toBe(401);
  });

  it('un compte suspendu en cours de session perd l’accès immédiatement, même avec un jeton encore valide (pas seulement le personnel ATAABA)', async () => {
    const admin = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Suspension', nom: 'Ba', prenom: 'Modou', telephone: '730000003', password: 'password',
    });
    const adminToken = admin.body.token;
    const member = await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Membre', prenom: 'Un', telephone: '730000004', password: 'password', companyRole: 'commercial' });
    const memberLogin = await request(app).post('/api/v1/auth/login').send({ telephone: '730000004', password: 'password' });
    const memberToken = memberLogin.body.token;

    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${memberToken}`)).status).toBe(200);

    // removeMember passe le compte en statut='suspendu' (companyController.ts) sans révoquer son
    // jeton déjà émis — c'est exactement le trou qu'authMiddleware.protect ferme désormais.
    const remove = await request(app).delete(`/api/v1/companies/members/${member.body.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(remove.status).toBe(200);

    expect((await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${memberToken}`)).status).toBe(401);
  });

  it('logout sans jeton est refusé (401)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(401);
  });
});
