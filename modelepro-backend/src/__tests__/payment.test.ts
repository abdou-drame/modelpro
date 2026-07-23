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
let paymentId: number;

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
    totalPrice: 50000,
    depositAmount: 20000,
    statut: 'en_attente',
    paymentStatus: 'unpaid',
  });
  orderId = order.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Module de Paiement (7.10)', () => {
  it('1. Bloque la création de paiement sans authentification', async () => {
    const res = await request(app).post('/api/v1/payments').send({
      orderId,
      montant: 20000,
      type: 'acompte',
      moyen: 'wave',
    });
    expect(res.status).toBe(401);
  });

  it('2. Crée un paiement d’acompte (Wave) et met à jour le statut de paiement de la commande', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderId,
        montant: 20000,
        type: 'acompte',
        moyen: 'wave',
        referenceTransaction: 'WAVE-TX-12345',
        statut: 'confirme',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    paymentId = res.body.id;
    expect(res.body.montant).toBe(20000);
    expect(res.body.type).toBe('acompte');
    expect(res.body.moyen).toBe('wave');
    expect(res.body.referenceTransaction).toBe('WAVE-TX-12345');

    // Vérifier mise à jour statut commande
    const orderRes = await request(app)
      .get(`/api/v1/artisans/orders/${orderId}`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.paymentStatus).toBe('deposit_paid');
  });

  it('3. Crée un paiement de frais de service (Free Money)', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderId,
        montant: 1000,
        type: 'frais_service',
        moyen: 'free_money',
        statut: 'confirme',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('frais_service');
    expect(res.body.moyen).toBe('free_money');
  });

  it('4. Crée un paiement du solde (Espèces) et marque la commande fully_paid', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderId,
        montant: 30000,
        type: 'solde',
        moyen: 'especes',
        statut: 'confirme',
      });
    expect(res.status).toBe(201);
    expect(res.body.moyen).toBe('especes');

    const orderRes = await request(app)
      .get(`/api/v1/artisans/orders/${orderId}`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.paymentStatus).toBe('fully_paid');
  });

  it('5. Récupère le résumé financier d’une commande', async () => {
    const res = await request(app)
      .get(`/api/v1/payments/summary/${orderId}`)
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe(orderId);
    expect(res.body.totalPrice).toBe(50000);
    expect(res.body.totalAcomptePaid).toBe(20000);
    expect(res.body.totalSoldePaid).toBe(30000);
    expect(res.body.totalOrderPaid).toBe(50000);
    expect(res.body.remainingBalance).toBe(0);
    expect(res.body.totalFraisServicePaid).toBe(1000);
    expect(res.body.paymentStatus).toBe('fully_paid');
  });

  it('6. Enregistre un paiement d’abonnement artisan (Orange Money)', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        montant: 5000,
        type: 'abonnement',
        moyen: 'orange_money',
        referenceTransaction: 'OM-SUB-999',
        statut: 'confirme',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('abonnement');
    expect(res.body.moyen).toBe('orange_money');

    // Vérifier abonnement artisan
    const subRes = await request(app)
      .get('/api/v1/payments/subscriptions/my')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(subRes.status).toBe(200);
    expect(subRes.body.statutAbonnement).toBe('actif');
    expect(subRes.body.dateFinAbonnement).not.toBeNull();
    expect(subRes.body.subscriptions.length).toBeGreaterThanOrEqual(1);
  });

  it('7. Met à jour le statut d’un paiement', async () => {
    const res = await request(app)
      .patch(`/api/v1/payments/${paymentId}/status`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ statut: 'confirme' });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('confirme');
  });
});
