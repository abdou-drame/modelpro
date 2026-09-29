import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { hashPassword } from '../utils/auth';

jest.setTimeout(30000);

let aToken: string;
let aUserId: number;
let bToken: string;
let staffToken: string;
let readonlyStaffToken: string;
let ticketId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  const a = await request(app).post('/api/v1/companies/register').send({ companyNom: 'Sup A', nom: 'A', prenom: 'A', telephone: '796000001', password: 'password' });
  aToken = a.body.token;
  aUserId = a.body.user.id;
  const b = await request(app).post('/api/v1/companies/register').send({ companyNom: 'Sup B', nom: 'B', prenom: 'B', telephone: '796000002', password: 'password' });
  bToken = b.body.token;

  const hash = await hashPassword('MotDePasse-Staff-1');
  await User.create({ nom: 'S', prenom: 'S', telephone: '700000021', password: hash, role: 'ataaba_staff', statut: 'actif', platformRole: 'support' });
  await User.create({ nom: 'R', prenom: 'R', telephone: '700000022', password: hash, role: 'ataaba_staff', statut: 'actif', platformRole: 'readonly' });
  staffToken = (await request(app).post('/api/v1/auth/login').send({ telephone: '700000021', password: 'MotDePasse-Staff-1' })).body.token;
  readonlyStaffToken = (await request(app).post('/api/v1/auth/login').send({ telephone: '700000022', password: 'MotDePasse-Staff-1' })).body.token;
}, 60000);

afterAll(async () => {
  await sequelize.close();
});

describe('Support et incidents', () => {
  it('un membre d’entreprise ouvre un ticket', async () => {
    const res = await request(app).post('/api/v1/support/tickets').set('Authorization', `Bearer ${aToken}`)
      .send({ sujet: 'Erreur à la facturation', message: 'Le PDF ne se génère pas', categorie: 'incident', priorite: 'haute' });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('ouvert');
    ticketId = res.body.id;
  });

  it('valide les champs (sujet/message, catégorie, priorité)', async () => {
    expect((await request(app).post('/api/v1/support/tickets').set('Authorization', `Bearer ${aToken}`).send({ sujet: 'x' })).status).toBe(400);
    expect((await request(app).post('/api/v1/support/tickets').set('Authorization', `Bearer ${aToken}`).send({ sujet: 'x', message: 'y', categorie: 'nimportequoi' })).status).toBe(400);
  });

  it('refuse sans token, et un compte non entreprise', async () => {
    expect((await request(app).post('/api/v1/support/tickets').send({ sujet: 'x', message: 'y' })).status).toBe(401);
    expect((await request(app).get('/api/v1/support/tickets').set('Authorization', `Bearer ${staffToken}`)).status).toBe(403);
  });

  it('isolation : l’entreprise B ne voit ni ne répond aux tickets de A', async () => {
    expect((await request(app).get('/api/v1/support/tickets').set('Authorization', `Bearer ${bToken}`)).body).toHaveLength(0);
    expect((await request(app).get(`/api/v1/support/tickets/${ticketId}`).set('Authorization', `Bearer ${bToken}`)).status).toBe(404);
    expect((await request(app).post(`/api/v1/support/tickets/${ticketId}/messages`).set('Authorization', `Bearer ${bToken}`).send({ message: 'intrus' })).status).toBe(404);
  });

  it('le support voit tous les tickets, filtre par priorité, mais le staff readonly n’y a pas accès', async () => {
    const list = await request(app).get('/api/v1/backoffice/tickets?priorite=haute').set('Authorization', `Bearer ${staffToken}`);
    expect(list.body.total).toBe(1);
    expect((await request(app).get('/api/v1/backoffice/tickets').set('Authorization', `Bearer ${readonlyStaffToken}`)).status).toBe(403);
    expect((await request(app).get('/api/v1/backoffice/tickets').set('Authorization', `Bearer ${aToken}`)).status).toBe(403);
  });

  it('la réponse publique du support notifie l’auteur ; la note interne reste invisible côté entreprise', async () => {
    const reply = await request(app).post(`/api/v1/backoffice/tickets/${ticketId}/messages`).set('Authorization', `Bearer ${staffToken}`).send({ message: 'Nous regardons.' });
    expect(reply.status).toBe(201);
    await request(app).post(`/api/v1/backoffice/tickets/${ticketId}/messages`).set('Authorization', `Bearer ${staffToken}`).send({ message: 'Note: client à surveiller', interne: true });

    expect(await Notification.count({ where: { userId: aUserId, type: 'nouveau_message' } })).toBe(1);

    const asCompany = await request(app).get(`/api/v1/support/tickets/${ticketId}`).set('Authorization', `Bearer ${aToken}`);
    expect(asCompany.body.statut).toBe('en_attente_client');
    expect(asCompany.body.messages.map((m: any) => m.message)).toEqual(['Le PDF ne se génère pas', 'Nous regardons.']);

    const asStaff = await request(app).get(`/api/v1/backoffice/tickets/${ticketId}`).set('Authorization', `Bearer ${staffToken}`);
    expect(asStaff.body.messages).toHaveLength(3);
  });

  it('la réponse du client remet le ticket en cours', async () => {
    await request(app).post(`/api/v1/support/tickets/${ticketId}/messages`).set('Authorization', `Bearer ${aToken}`).send({ message: 'Merci' });
    const t = await request(app).get(`/api/v1/support/tickets/${ticketId}`).set('Authorization', `Bearer ${aToken}`);
    expect(t.body.statut).toBe('en_cours');
  });

  it('le support change statut/priorité/assignation ; résolution horodatée ; ticket fermé non répondable', async () => {
    const upd = await request(app).patch(`/api/v1/backoffice/tickets/${ticketId}`).set('Authorization', `Bearer ${staffToken}`).send({ statut: 'resolu', priorite: 'normale' });
    expect(upd.status).toBe(200);
    expect(upd.body.resolvedAt).not.toBeNull();
    expect((await request(app).patch(`/api/v1/backoffice/tickets/${ticketId}`).set('Authorization', `Bearer ${staffToken}`).send({ statut: 'bidon' })).status).toBe(400);

    await request(app).patch(`/api/v1/backoffice/tickets/${ticketId}`).set('Authorization', `Bearer ${staffToken}`).send({ statut: 'ferme' });
    const late = await request(app).post(`/api/v1/support/tickets/${ticketId}/messages`).set('Authorization', `Bearer ${aToken}`).send({ message: 'Encore ?' });
    expect(late.status).toBe(400);
  });

  it('une entreprise suspendue peut toujours contacter le support', async () => {
    const list = await request(app).get('/api/v1/backoffice/companies').set('Authorization', `Bearer ${staffToken}`);
    expect(list.status).toBe(200);
    const { CompanySubscription } = require('../models/CompanySubscription');
    await CompanySubscription.update({ statut: 'suspendu' }, { where: {} });
    const write = await request(app).post('/api/v1/crm/customers').set('Authorization', `Bearer ${aToken}`).send({ nom: 'x' });
    expect(write.status).toBe(402);
    const ticket = await request(app).post('/api/v1/support/tickets').set('Authorization', `Bearer ${aToken}`).send({ sujet: 'Régularisation', message: 'Comment renouveler ?', categorie: 'facturation' });
    expect(ticket.status).toBe(201);
  });
});
