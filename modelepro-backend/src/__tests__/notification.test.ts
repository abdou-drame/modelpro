import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Order } from '../models/Order';
import { Notification } from '../models/Notification';
import { generateToken } from '../utils/auth';

let clientToken: string;
let artisanToken: string;
let notificationId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const clientUser = await User.create({
    nom: 'Client',
    prenom: 'Notif',
    telephone: '770000020',
    email: 'client-notif@test.com',
    password: 'password',
    role: 'client',
    statut: 'actif',
  });

  const artisanUser = await User.create({
    nom: 'Artisan',
    prenom: 'Notif',
    telephone: '770000021',
    email: 'artisan-notif@test.com',
    password: 'password',
    role: 'artisan',
    statut: 'actif',
  });

  await Artisan.create({
    userId: artisanUser.id,
    métier: 'Tailleur',
    atelier: 'Atelier C',
    localisation: 'Thiès',
    statutValidation: 'valide',
  });

  await Order.create({
    artisanId: 1,
    clientId: clientUser.id,
    mesures: 'Taille S',
    prix: 15000,
    statut: 'en_cours',
  });

  const notification = await Notification.create({
    userId: clientUser.id,
    type: 'nouveau_message',
    titre: 'Nouveau message',
    description: 'Un nouveau message a été envoyé',
    lu: false,
    referenceId: 1,
  });

  notificationId = notification.id;
  clientToken = generateToken(clientUser.id, 'client');
  artisanToken = generateToken(artisanUser.id, 'artisan');
});

afterAll(async () => {
  await sequelize.close();
});

describe('Notifications', () => {
  it('liste les notifications de l’utilisateur connecté', async () => {
    const response = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });

  it('marque une notification comme lue', async () => {
    const response = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(response.status).toBe(200);
    expect(response.body.lu).toBe(true);

    const updated = await Notification.findByPk(notificationId);
    expect(updated?.lu).toBe(true);
  });

  it('refuse l’accès sans authentification', async () => {
    const response = await request(app).get('/api/v1/notifications');
    expect(response.status).toBe(401);
  });
});
