import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Order } from '../models/Order';
import { generateToken } from '../utils/auth';

let clientToken: string;
let artisanToken: string;
let orderId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const artisanUser = await User.create({
    nom: 'Artisan',
    prenom: 'Test',
    telephone: '0711111111',
    email: 'artisan.pay@test.com',
    password: 'password',
    role: 'artisan',
    statut: 'actif',
  });

  const clientUser = await User.create({
    nom: 'Client',
    prenom: 'Test',
    telephone: '0722222222',
    email: 'client.pay@test.com',
    password: 'password',
    role: 'client',
    statut: 'actif',
  });

  const artisanProfile = await Artisan.create({
    userId: artisanUser.id,
    métier: 'tailleur',
    atelier: 'Atelier Pay',
    localisation: 'Dakar',
  });

  artisanToken = generateToken(artisanUser.id, 'artisan');
  clientToken = generateToken(clientUser.id, 'client');

  const order = await Order.create({
    artisanId: artisanProfile.id,
    clientId: clientUser.id,
    mesures: 'L',
    photoTissu: 'photo.jpg',
    consignes: 'Test payment',
    prix: 50000,
    statut: 'en_attente',
    paymentStatus: 'unpaid',
  });
  orderId = order.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Module de Paiement', () => {
  it('1. Bloque la création de paiement sans authentification', async () => {
    const res = await request(app).post('/api/v1/payments').send({
      orderId,
      montant: 20000,
      type: 'acompte',
      moyen: 'wave',
    });
    expect(res.status).toBe(401);
  });

  it('2. Crée un paiement d’acompte et met à jour le statut de paiement de la commande', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderId,
        montant: 20000,
        type: 'acompte',
        moyen: 'wave',
        statut: 'confirme',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.montant).toBe(20000);
    expect(res.body.type).toBe('acompte');

    // Vérifier mise à jour statut commande
    const orderRes = await request(app)
      .get(`/api/v1/artisans/orders/${orderId}`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.paymentStatus).toBe('deposit_paid');
  });

  it('3. Crée un paiement du solde et marque la commande fully_paid', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderId,
        montant: 30000,
        type: 'solde',
        moyen: 'orange_money',
        statut: 'confirme',
      });
    expect(res.status).toBe(201);

    const orderRes = await request(app)
      .get(`/api/v1/artisans/orders/${orderId}`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.paymentStatus).toBe('fully_paid');
  });

  it('4. Récupère l’historique des paiements d’une commande', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/order/${orderId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(2);
  });
});
