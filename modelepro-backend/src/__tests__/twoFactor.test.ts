import request from 'supertest';
import { authenticator } from 'otplib';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { hashPassword } from '../utils/auth';

jest.setTimeout(30000);

let superToken: string;
let staffId: number;
let secret: string;

const login = async (telephone: string, password = 'MotDePasse-Staff-1') => {
  const res = await request(app).post('/api/v1/auth/login').send({ telephone, password });
  return res.body;
};

const extractSecret = (otpauthUrl: string): string => {
  const match = otpauthUrl.match(/secret=([A-Z0-9]+)/);
  if (!match) throw new Error('Secret introuvable dans otpauthUrl.');
  return match[1];
};

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const staff = await User.create({
    nom: 'Deux', prenom: 'Facteurs', telephone: '710000001', password: await hashPassword('MotDePasse-Staff-1'),
    role: 'ataaba_staff', statut: 'actif', platformRole: 'superadmin',
  });
  staffId = staff.id;
  superToken = (await login('710000001')).token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('2FA du personnel ATAABA (Phase 5, cahier des charges §14)', () => {
  it('connexion normale tant que la 2FA n’est pas activée', async () => {
    const res = await login('710000001');
    expect(res.token).toBeTruthy();
    expect(res.requiresTwoFactor).toBeUndefined();
  });

  it('setup génère un secret + QR code ; confirm avec un mauvais code échoue', async () => {
    const setup = await request(app).post('/api/v1/backoffice/2fa/setup').set('Authorization', `Bearer ${superToken}`);
    expect(setup.status).toBe(200);
    expect(setup.body.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    expect(setup.body.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    secret = extractSecret(setup.body.otpauthUrl);

    const badConfirm = await request(app).post('/api/v1/backoffice/2fa/confirm').set('Authorization', `Bearer ${superToken}`).send({ code: '000000' });
    expect(badConfirm.status).toBe(400);

    const user = await User.findByPk(staffId);
    expect(user!.twoFactorEnabled).toBe(false);
  });

  it('confirm avec un code TOTP valide active la 2FA', async () => {
    const code = authenticator.generate(secret);
    const confirm = await request(app).post('/api/v1/backoffice/2fa/confirm').set('Authorization', `Bearer ${superToken}`).send({ code });
    expect(confirm.status).toBe(200);

    const user = await User.findByPk(staffId);
    expect(user!.twoFactorEnabled).toBe(true);
  });

  it('connexion avec 2FA activée renvoie un tempToken, jamais un jeton d’accès direct', async () => {
    const res = await login('710000001');
    expect(res.requiresTwoFactor).toBe(true);
    expect(res.tempToken).toBeTruthy();
    expect(res.token).toBeUndefined();
  });

  it('le tempToken est rejeté s’il est utilisé comme un jeton d’accès normal', async () => {
    const res = await login('710000001');
    const attempt = await request(app).get('/api/v1/backoffice/stats').set('Authorization', `Bearer ${res.tempToken}`);
    expect(attempt.status).toBe(401);
  });

  it('POST /auth/2fa/verify : mauvais code refusé, bon code renvoie le vrai jeton', async () => {
    const loginRes = await login('710000001');

    const bad = await request(app).post('/api/v1/auth/2fa/verify').send({ tempToken: loginRes.tempToken, code: '000000' });
    expect(bad.status).toBe(401);

    const code = authenticator.generate(secret);
    const good = await request(app).post('/api/v1/auth/2fa/verify').send({ tempToken: loginRes.tempToken, code });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeTruthy();

    const stats = await request(app).get('/api/v1/backoffice/stats').set('Authorization', `Bearer ${good.body.token}`);
    expect(stats.status).toBe(200);
  });

  it('disable exige un code TOTP valide (pas seulement la session en cours)', async () => {
    const badDisable = await request(app).post('/api/v1/backoffice/2fa/disable').set('Authorization', `Bearer ${superToken}`).send({ code: '000000' });
    expect(badDisable.status).toBe(400);

    const code = authenticator.generate(secret);
    const disable = await request(app).post('/api/v1/backoffice/2fa/disable').set('Authorization', `Bearer ${superToken}`).send({ code });
    expect(disable.status).toBe(200);

    const res = await login('710000001');
    expect(res.token).toBeTruthy();
    expect(res.requiresTwoFactor).toBeUndefined();
  });

  it('un superadmin peut réinitialiser la 2FA d’un membre du staff (filet de récupération)', async () => {
    const setup = await request(app).post('/api/v1/backoffice/2fa/setup').set('Authorization', `Bearer ${superToken}`);
    const newSecret = extractSecret(setup.body.otpauthUrl);
    await request(app).post('/api/v1/backoffice/2fa/confirm').set('Authorization', `Bearer ${superToken}`).send({ code: authenticator.generate(newSecret) });

    const loginBeforeReset = await login('710000001');
    expect(loginBeforeReset.requiresTwoFactor).toBe(true);

    const reset = await request(app).post(`/api/v1/backoffice/staff/${staffId}/2fa/reset`).set('Authorization', `Bearer ${superToken}`);
    expect(reset.status).toBe(200);

    const res = await login('710000001');
    expect(res.token).toBeTruthy();
    expect(res.requiresTwoFactor).toBeUndefined();
  });

  it('un compte non-staff (entreprise) n’a pas accès aux routes 2FA du back-office', async () => {
    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier 2FA', nom: 'Kane', prenom: 'Awa', telephone: '710000002', password: 'password',
    });
    const res = await request(app).post('/api/v1/backoffice/2fa/setup').set('Authorization', `Bearer ${reg.body.token}`);
    expect(res.status).toBe(403);
  });
});
