import request from 'supertest';
import path from 'path';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Order } from '../models/Order';
import { Message } from '../models/Message';
import { Notification } from '../models/Notification';
import { generateToken } from '../utils/auth';

let clientToken: string;
let artisanToken: string;
let externalToken: string;
let orderId: number;
let artisanUserId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const clientUser = await User.create({
    nom: 'Client',
    prenom: 'Test',
    telephone: '770000010',
    email: 'client-msg@test.com',
    password: 'password',
    role: 'client',
    statut: 'actif',
  });

  const artisanUser = await User.create({
    nom: 'Artisan',
    prenom: 'Test',
    telephone: '770000011',
    email: 'artisan-msg@test.com',
    password: 'password',
    role: 'artisan',
    statut: 'actif',
  });

  artisanUserId = artisanUser.id;

  const artisanProfile = await Artisan.create({
    userId: artisanUser.id,
    métier: 'Tailleur',
    atelier: 'Atelier B',
    localisation: 'Dakar',
    statutValidation: 'valide',
  });

  const order = await Order.create({
    artisanId: artisanProfile.id,
    clientId: clientUser.id,
    mesures: 'Taille M',
    prix: 30000,
    statut: 'en_cours',
  });

  orderId = order.id;

  clientToken = generateToken(clientUser.id, 'client');
  artisanToken = generateToken(artisanUser.id, 'artisan');

  const externalUser = await User.create({
    nom: 'Externe',
    prenom: 'Test',
    telephone: '770000012',
    email: 'external-msg@test.com',
    password: 'password',
    role: 'client',
    statut: 'actif',
  });

  externalToken = generateToken(externalUser.id, 'client');
});

afterAll(async () => {
  await sequelize.close();
});

describe('Messagerie contextuelle', () => {
  it('refuse l’envoi et la lecture sans authentification', async () => {
    const sendResponse = await request(app).post('/api/v1/messages').send({ orderId, texte: 'Bonjour' });
    expect(sendResponse.status).toBe(401);

    const readResponse = await request(app).get(`/api/v1/messages/order/${orderId}`);
    expect(readResponse.status).toBe(401);
  });

  it('refuse l’accès à une commande à un utilisateur externe', async () => {
    const sendResponse = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${externalToken}`)
      .send({ orderId, texte: 'Bonjour' });

    expect(sendResponse.status).toBe(403);

    const readResponse = await request(app)
      .get(`/api/v1/messages/order/${orderId}`)
      .set('Authorization', `Bearer ${externalToken}`);

    expect(readResponse.status).toBe(403);
  });

  it('envoie un message texte et crée une notification non lue pour le destinataire', async () => {
    const response = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId, texte: 'Bonjour artisan' });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.texte).toBe('Bonjour artisan');

    const messageInDb = await Message.findOne({ where: { orderId, texte: 'Bonjour artisan' } });
    expect(messageInDb).toBeTruthy();

    const notifications = await Notification.findAll({ where: { userId: artisanUserId, type: 'nouveau_message' } });
    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0].lu).toBe(false);
  });

  it('accepte l’envoi d’une photo dans le fil de discussion', async () => {
    const response = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${artisanToken}`)
      .attach('photo', path.join(__dirname, 'fixtures', 'test-image.png'));

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.photoUrl).toBeTruthy();
  });

  it('retourne l’historique des messages d’une commande trié par date croissante', async () => {
    const response = await request(app)
      .get(`/api/v1/messages/order/${orderId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
});
