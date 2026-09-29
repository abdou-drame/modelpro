import request from 'supertest';
import path from 'path';
import fs from 'fs';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Company } from '../models/Company';

let companyAId: number;
let companyAAdminToken: string;
let companyAMemberId: number;

let companyBId: number;
let companyBAdminToken: string;

// Contrairement à un test Cloudinary (mocké ou en échec sans credentials), l'upload local écrit
// de vrais fichiers sur le disque (localUploadService) — nettoyés ici pour ne pas accumuler des
// fichiers orphelins à chaque exécution de la suite.
const LOGOS_DIR = path.join(__dirname, '../../uploads/logos');

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await fs.promises.rm(LOGOS_DIR, { recursive: true, force: true });
  await sequelize.close();
});

describe('Organisation / Tenant (Naatalix)', () => {
  it('crée une entreprise et son compte admin en un seul appel', async () => {
    const res = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier A',
      nom: 'Diallo',
      prenom: 'Awa',
      telephone: '780000001',
      password: 'password',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.company.nom).toBe('Atelier A');
    expect(res.body.user.companyRole).toBe('admin');
    expect(res.body.user.role).toBe('entreprise');

    companyAId = res.body.company.id;
    companyAAdminToken = res.body.token;

    const companyInDb = await Company.findByPk(companyAId);
    expect(companyInDb).toBeTruthy();
    const userInDb = await User.findOne({ where: { telephone: '780000001' } });
    expect(userInDb?.companyId).toBe(companyAId);
  });

  it('refuse la création d’entreprise si le téléphone est déjà utilisé', async () => {
    const res = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Doublon',
      nom: 'X',
      prenom: 'Y',
      telephone: '780000001',
      password: 'password',
    });
    expect(res.status).toBe(400);
  });

  it('connecte l’admin de l’entreprise et embarque companyId/companyRole dans la réponse', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      telephone: '780000001',
      password: 'password',
    });
    expect(res.status).toBe(200);
    expect(res.body.user.companyId).toBe(companyAId);
    expect(res.body.user.companyRole).toBe('admin');
  });

  it('bloque l’accès aux routes entreprise sans authentification', async () => {
    const res = await request(app).get('/api/v1/companies/me');
    expect(res.status).toBe(401);
  });

  it('l’admin consulte sa propre entreprise', async () => {
    const res = await request(app)
      .get('/api/v1/companies/me')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(companyAId);
  });

  it('l’admin ajoute un membre avec un rôle commercial', async () => {
    const res = await request(app)
      .post('/api/v1/companies/members')
      .set('Authorization', `Bearer ${companyAAdminToken}`)
      .send({
        nom: 'Ba',
        prenom: 'Moussa',
        telephone: '780000002',
        password: 'password',
        companyRole: 'commercial',
      });
    expect(res.status).toBe(201);
    expect(res.body.companyRole).toBe('commercial');
    companyAMemberId = res.body.id;
  });

  it('refuse à un rôle non-admin (commercial) de créer un membre', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      telephone: '780000002',
      password: 'password',
    });
    const commercialToken = loginRes.body.token;

    const res = await request(app)
      .post('/api/v1/companies/members')
      .set('Authorization', `Bearer ${commercialToken}`)
      .send({ nom: 'Z', prenom: 'Z', telephone: '780000099', password: 'password', companyRole: 'stock' });
    expect(res.status).toBe(403);
  });

  it('liste les membres de l’entreprise', async () => {
    const res = await request(app)
      .get('/api/v1/companies/members')
      .set('Authorization', `Bearer ${companyAAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it('crée une deuxième entreprise totalement indépendante', async () => {
    const res = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier B',
      nom: 'Fall',
      prenom: 'Ibra',
      telephone: '780000003',
      password: 'password',
    });
    expect(res.status).toBe(201);
    companyBId = res.body.company.id;
    companyBAdminToken = res.body.token;
    expect(companyBId).not.toBe(companyAId);
  });

  it('isole strictement les données : l’entreprise B ne voit pas les membres de l’entreprise A', async () => {
    const res = await request(app)
      .get('/api/v1/companies/members')
      .set('Authorization', `Bearer ${companyBAdminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body.every((m: any) => m.id !== companyAMemberId)).toBe(true);
  });

  it('isole strictement les données : l’entreprise B ne peut pas modifier un membre de l’entreprise A', async () => {
    const res = await request(app)
      .patch(`/api/v1/companies/members/${companyAMemberId}/role`)
      .set('Authorization', `Bearer ${companyBAdminToken}`)
      .send({ companyRole: 'admin' });
    expect(res.status).toBe(404);
  });

  it('un compte ModèlePro (client/artisan/admin) sans entreprise est rejeté sur les routes companies', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      nom: 'Client',
      prenom: 'Sans Entreprise',
      telephone: '780000004',
      password: 'password',
      role: 'client',
    });
    expect(registerRes.status).toBe(201);
    const clientToken = registerRes.body.token;

    const res = await request(app)
      .get('/api/v1/companies/me')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });
});

// Stockage local du logo (décision du 2026-09-24 : backend hébergé sur un VPS à disque
// persistant, pas besoin de Cloudinary pour ce cas d'usage). L'URL retournée doit être réutilisable
// telle quelle par pdfService (qui fait un simple fetch() dessus pour l'incruster dans les PDF).
describe('Logo entreprise (stockage local)', () => {
  it('un admin peut téléverser le logo de son entreprise, l’URL remplace l’ancienne au second envoi', async () => {
    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Logo', nom: 'Ba', prenom: 'Moussa', telephone: '780000005', password: 'password',
    });
    const token = reg.body.token;

    const first = await request(app)
      .post('/api/v1/companies/me/logo')
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', path.join(__dirname, 'fixtures', 'test-image.png'));
    expect(first.status).toBe(200);
    expect(first.body.logoUrl).toMatch(/^http:\/\/localhost:5000\/uploads\/logos\/.+\.png$/);

    const company = await request(app).get('/api/v1/companies/me').set('Authorization', `Bearer ${token}`);
    expect(company.body.logoUrl).toBe(first.body.logoUrl);

    const second = await request(app)
      .post('/api/v1/companies/me/logo')
      .set('Authorization', `Bearer ${token}`)
      .attach('logo', path.join(__dirname, 'fixtures', 'test-image.png'));
    expect(second.status).toBe(200);
    expect(second.body.logoUrl).not.toBe(first.body.logoUrl);
  });

  it('refuse sans fichier (400) et refuse à un membre non-admin (403)', async () => {
    const reg = await request(app).post('/api/v1/companies/register').send({
      companyNom: 'Atelier Logo 2', nom: 'Sy', prenom: 'Fatim', telephone: '780000006', password: 'password',
    });
    const adminToken = reg.body.token;

    const noFile = await request(app).post('/api/v1/companies/me/logo').set('Authorization', `Bearer ${adminToken}`);
    expect(noFile.status).toBe(400);

    await request(app).post('/api/v1/companies/members').set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'M', prenom: 'Un', telephone: '780000007', password: 'password', companyRole: 'commercial' });
    const login = await request(app).post('/api/v1/auth/login').send({ telephone: '780000007', password: 'password' });
    const memberToken = login.body.token;

    const forbidden = await request(app)
      .post('/api/v1/companies/me/logo')
      .set('Authorization', `Bearer ${memberToken}`)
      .attach('logo', path.join(__dirname, 'fixtures', 'test-image.png'));
    expect(forbidden.status).toBe(403);
  });
});
