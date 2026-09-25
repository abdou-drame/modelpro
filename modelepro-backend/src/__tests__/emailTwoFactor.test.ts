import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { hashPassword } from '../utils/auth';

jest.setTimeout(30000);

// Sans SMTP_HOST configuré (le cas en test), emailOtpService/emailService journalisent le code en
// console au lieu d'un vrai envoi, et les contrôleurs le renvoient aussi dans `devCode` (hors
// production uniquement — voir authController.ts/companyTwoFactorController.ts) : ces tests s'en
// servent pour valider tout le cycle sans dépendre d'une vraie boîte mail.

describe('2FA par e-mail pour les comptes Naatalix (Phase 5)', () => {
  let token: string;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Email 2FA', nom: 'Ndiaye', prenom: 'Coumba',
      telephone: '720000001', email: 'coumba@example.com', password: 'password',
    });
    token = reg.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('connexion normale tant que la 2FA e-mail n’est pas activée', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ telephone: '720000001', password: 'password' });
    expect(res.body.token).toBeTruthy();
    expect(res.body.requiresTwoFactor).toBeUndefined();
  });

  it('send-code renvoie un devCode en environnement de test (pas de SMTP configuré)', async () => {
    const res = await request(app).post('/api/v1/companies/me/2fa/email/send-code').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.devCode).toMatch(/^\d{6}$/);
  });

  it('enable refuse un mauvais code', async () => {
    const res = await request(app).post('/api/v1/companies/me/2fa/email/enable').set('Authorization', `Bearer ${token}`).send({ code: '000000' });
    expect(res.status).toBe(400);
  });

  it('enable avec le bon code active la 2FA e-mail ; le code est à usage unique', async () => {
    const send = await request(app).post('/api/v1/companies/me/2fa/email/send-code').set('Authorization', `Bearer ${token}`);
    const code = send.body.devCode;

    const enable = await request(app).post('/api/v1/companies/me/2fa/email/enable').set('Authorization', `Bearer ${token}`).send({ code });
    expect(enable.status).toBe(200);

    const reuse = await request(app).post('/api/v1/companies/me/2fa/email/enable').set('Authorization', `Bearer ${token}`).send({ code });
    expect(reuse.status).toBe(400);
  });

  it('connexion avec la 2FA e-mail activée renvoie un tempToken et un nouveau code (jamais de jeton direct)', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ telephone: '720000001', password: 'password' });
    expect(res.body.requiresTwoFactor).toBe(true);
    expect(res.body.method).toBe('email');
    expect(res.body.tempToken).toBeTruthy();
    expect(res.body.devCode).toMatch(/^\d{6}$/);
    expect(res.body.token).toBeUndefined();
  });

  it('le tempToken est rejeté comme jeton d’accès normal', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ telephone: '720000001', password: 'password' });
    const attempt = await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${login.body.tempToken}`);
    expect(attempt.status).toBe(401);
  });

  it('POST /auth/2fa/verify : mauvais code refusé, bon code renvoie le vrai jeton', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ telephone: '720000001', password: 'password' });

    const bad = await request(app).post('/api/v1/auth/2fa/verify').send({ tempToken: login.body.tempToken, code: '000000' });
    expect(bad.status).toBe(401);

    const good = await request(app).post('/api/v1/auth/2fa/verify').send({ tempToken: login.body.tempToken, code: login.body.devCode });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeTruthy();

    const me = await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${good.body.token}`);
    expect(me.status).toBe(200);
  });

  it('disable exige un code fraîchement envoyé', async () => {
    const badDisable = await request(app).post('/api/v1/companies/me/2fa/email/disable').set('Authorization', `Bearer ${token}`).send({ code: '000000' });
    expect(badDisable.status).toBe(400);

    const send = await request(app).post('/api/v1/companies/me/2fa/email/send-code').set('Authorization', `Bearer ${token}`);
    const disable = await request(app).post('/api/v1/companies/me/2fa/email/disable').set('Authorization', `Bearer ${token}`).send({ code: send.body.devCode });
    expect(disable.status).toBe(200);

    const res = await request(app).post('/api/v1/auth/login').send({ telephone: '720000001', password: 'password' });
    expect(res.body.token).toBeTruthy();
    expect(res.body.requiresTwoFactor).toBeUndefined();
  });

  it('refuse l’activation sans adresse e-mail enregistrée sur le compte', async () => {
    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Sans Email', nom: 'Sarr', prenom: 'Ibra', telephone: '720000002', password: 'password',
    });
    const res = await request(app).post('/api/v1/companies/me/2fa/email/send-code').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(400);
  });

  it('un membre du staff ATAABA n’a pas accès aux routes 2FA e-mail Naatalix', async () => {
    await User.create({
      nom: 'Staff', prenom: 'Test', telephone: '720000003', password: await hashPassword('password'),
      role: 'ataaba_staff', statut: 'actif', platformRole: 'support',
    });
    const login = await request(app).post('/api/v1/auth/login').send({ telephone: '720000003', password: 'password' });
    expect(login.body.token).toBeTruthy();

    const res = await request(app).post('/api/v1/companies/me/2fa/email/send-code').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });
});
