import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Order } from '../models/Order';
import { Pack } from '../models/Pack';
import { generateToken } from '../utils/auth';
import { initiatePayment, verifyIpnSignature } from '../services/paytechService';

// La confirmation d'un abonnement payé en mobile money passe par le vrai réseau PayTech
// (initiatePayment) et par un webhook signé (verifyIpnSignature) : on mocke les deux pour
// tester le flux côté modelepro-backend sans dépendre d'un service externe.
jest.mock('../services/paytechService', () => ({
  initiatePayment: jest.fn(),
  verifyIpnSignature: jest.fn(),
  buildAppRedirectUrl: jest.fn((deepLink: string) => `https://tunnel.example/api/v1/payments/redirect?to=${encodeURIComponent(deepLink)}`),
}));
const mockInitiatePayment = initiatePayment as jest.Mock;
const mockVerifyIpnSignature = verifyIpnSignature as jest.Mock;

let clientToken: string;
let artisanToken: string;
let orderId: number;
let paymentId: number;
let packEssentielId: number;
let abonnementPaymentId: number;
let fraisServicePaymentId: number;

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

  const pack = await Pack.create({
    code: 'essentiel',
    nom: 'Essentiel',
    prixMensuel: 3000,
    prixAnnuel: 30000,
    limiteModelesActifs: 5,
  });
  packEssentielId = pack.id;
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

  it('2. Un acompte payé en Wave passe par PayTech et reste en_attente jusqu’à l’IPN', async () => {
    mockInitiatePayment.mockResolvedValueOnce({
      success: 1,
      token: 'PAYTECH-TOKEN-ORDER-1',
      redirect_url: 'https://paytech.sn/payment/PAYTECH-TOKEN-ORDER-1',
    });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderId,
        montant: 20000,
        type: 'acompte',
        moyen: 'wave',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    paymentId = res.body.id;
    expect(res.body.montant).toBe(20000);
    expect(res.body.type).toBe('acompte');
    expect(res.body.moyen).toBe('wave');
    expect(res.body.statut).toBe('en_attente');
    expect(res.body.referenceTransaction).toBe('PAYTECH-TOKEN-ORDER-1');
    expect(res.body.redirectUrl).toBe('https://paytech.sn/payment/PAYTECH-TOKEN-ORDER-1');

    // Rien n'est mis à jour côté commande tant que PayTech n'a pas confirmé.
    const orderRes = await request(app)
      .get(`/api/v1/artisans/orders/${orderId}`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.paymentStatus).toBe('unpaid');
  });

  it('2b. Active l’acompte quand l’IPN PayTech confirme le paiement (sale_complete)', async () => {
    mockVerifyIpnSignature.mockReturnValueOnce(true);

    const res = await request(app)
      .post('/api/v1/payments/paytech/ipn')
      .send({
        type_event: 'sale_complete',
        custom_field: JSON.stringify({ paymentId, type: 'commande' }),
      });
    expect(res.status).toBe(200);

    const orderRes = await request(app)
      .get(`/api/v1/artisans/orders/${orderId}`)
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(orderRes.status).toBe(200);
    expect(orderRes.body.paymentStatus).toBe('deposit_paid');
  });

  it('3. Crée un paiement de frais de service (Free Money) via PayTech', async () => {
    mockInitiatePayment.mockResolvedValueOnce({
      success: 1,
      token: 'PAYTECH-TOKEN-ORDER-2',
      redirect_url: 'https://paytech.sn/payment/PAYTECH-TOKEN-ORDER-2',
    });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        orderId,
        montant: 1000,
        type: 'frais_service',
        moyen: 'free_money',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('frais_service');
    expect(res.body.moyen).toBe('free_money');
    expect(res.body.statut).toBe('en_attente');
    expect(res.body.redirectUrl).toBe('https://paytech.sn/payment/PAYTECH-TOKEN-ORDER-2');
    fraisServicePaymentId = res.body.id;
  });

  it('3b. Confirme le paiement de frais de service via l’IPN PayTech', async () => {
    mockVerifyIpnSignature.mockReturnValueOnce(true);

    const res = await request(app)
      .post('/api/v1/payments/paytech/ipn')
      .send({
        type_event: 'sale_complete',
        custom_field: JSON.stringify({ paymentId: fraisServicePaymentId, type: 'commande' }),
      });
    expect(res.status).toBe(200);
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

  it('6. Un abonnement payé en mobile money passe par PayTech et reste en_attente jusqu’à l’IPN', async () => {
    mockInitiatePayment.mockResolvedValueOnce({
      success: 1,
      token: 'PAYTECH-TOKEN-TEST',
      redirect_url: 'https://paytech.sn/payment/PAYTECH-TOKEN-TEST',
    });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        packId: packEssentielId,
        cycle: 'mensuel',
        type: 'abonnement',
        moyen: 'orange_money',
      });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('abonnement');
    expect(res.body.moyen).toBe('orange_money');
    expect(res.body.montant).toBe(3000);
    expect(res.body.statut).toBe('en_attente');
    expect(res.body.referenceTransaction).toBe('PAYTECH-TOKEN-TEST');
    expect(res.body.redirectUrl).toBe('https://paytech.sn/payment/PAYTECH-TOKEN-TEST');
    abonnementPaymentId = res.body.id;

    // Rien n'est activé tant que PayTech n'a pas confirmé.
    const subRes = await request(app)
      .get('/api/v1/payments/subscriptions/my')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(subRes.status).toBe(200);
    expect(subRes.body.statutAbonnement).not.toBe('actif');
  });

  it('6b. Rejette l’IPN PayTech si la signature est invalide', async () => {
    mockVerifyIpnSignature.mockReturnValueOnce(false);

    const res = await request(app)
      .post('/api/v1/payments/paytech/ipn')
      .send({
        type_event: 'sale_complete',
        custom_field: JSON.stringify({ paymentId: abonnementPaymentId, type: 'abonnement' }),
      });
    expect(res.status).toBe(403);
  });

  it('6c. Active l’abonnement quand l’IPN PayTech confirme le paiement (sale_complete)', async () => {
    mockVerifyIpnSignature.mockReturnValueOnce(true);

    const res = await request(app)
      .post('/api/v1/payments/paytech/ipn')
      .send({
        type_event: 'sale_complete',
        custom_field: JSON.stringify({ paymentId: abonnementPaymentId, type: 'abonnement' }),
      });
    expect(res.status).toBe(200);

    const subRes = await request(app)
      .get('/api/v1/payments/subscriptions/my')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(subRes.status).toBe(200);
    expect(subRes.body.statutAbonnement).toBe('actif');
    expect(subRes.body.dateFinAbonnement).not.toBeNull();
    expect(subRes.body.subscriptions.length).toBeGreaterThanOrEqual(1);
  });

  it('6d. Marque le paiement échoué si l’initiation PayTech échoue', async () => {
    mockInitiatePayment.mockRejectedValueOnce(new Error('PayTech indisponible'));

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        packId: packEssentielId,
        cycle: 'mensuel',
        type: 'abonnement',
        moyen: 'wave',
      });
    expect(res.status).toBe(502);
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
