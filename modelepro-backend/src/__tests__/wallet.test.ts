import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Order } from '../models/Order';
import { generateToken } from '../utils/auth';
import { initiatePayment, verifyIpnSignature } from '../services/paytechService';

// Les paiements de commande passent désormais uniquement par PayTech (mobile money) :
// on mocke le réseau PayTech et son webhook signé pour tester le crédit du wallet.
jest.mock('../services/paytechService', () => ({
  initiatePayment: jest.fn(),
  verifyIpnSignature: jest.fn(),
  buildAppRedirectUrl: jest.fn((deepLink: string) => `https://tunnel.example/api/v1/payments/redirect?to=${encodeURIComponent(deepLink)}`),
}));
const mockInitiatePayment = initiatePayment as jest.Mock;
const mockVerifyIpnSignature = verifyIpnSignature as jest.Mock;

let clientToken: string;
let artisanToken: string;
let adminToken: string;
let orderId: number;
let retraitId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const artisanUser = await User.create({
    nom: 'Artisan',
    prenom: 'Wallet',
    telephone: '0733333333',
    email: 'artisan.wallet@test.com',
    password: 'password',
    role: 'artisan',
    statut: 'actif',
  });

  const clientUser = await User.create({
    nom: 'Client',
    prenom: 'Wallet',
    telephone: '0744444444',
    email: 'client.wallet@test.com',
    password: 'password',
    role: 'client',
    statut: 'actif',
  });

  const adminUser = await User.create({
    nom: 'Admin',
    prenom: 'Wallet',
    telephone: '0755555555',
    email: 'admin.wallet@test.com',
    password: 'password',
    role: 'admin',
    statut: 'actif',
  });

  const artisanProfile = await Artisan.create({
    userId: artisanUser.id,
    métier: 'tailleur',
    atelier: 'Atelier Wallet',
    localisation: 'Dakar',
    waveNumber: '771234567',
  });

  artisanToken = generateToken(artisanUser.id, 'artisan', 0);
  clientToken = generateToken(clientUser.id, 'client', 0);
  adminToken = generateToken(adminUser.id, 'admin', 0);

  const order = await Order.create({
    artisanId: artisanProfile.id,
    clientId: clientUser.id,
    mesures: 'L',
    photoTissu: 'photo.jpg',
    consignes: 'Test wallet',
    prix: 40000,
    totalPrice: 40000,
    depositAmount: 15000,
    statut: 'en_attente',
    paymentStatus: 'unpaid',
  });
  orderId = order.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Wallet artisan (commissions de commande)', () => {
  it('1. Wallet vide avant tout paiement', async () => {
    const res = await request(app)
      .get('/api/v1/artisans/wallet')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(res.status).toBe(200);
    expect(res.body.solde).toBe(0);
    expect(res.body.transactions).toEqual([]);
  });

  it('2. Crédite le wallet quand un acompte de commande est confirmé (PayTech)', async () => {
    mockInitiatePayment.mockResolvedValueOnce({
      success: 1,
      token: 'PAYTECH-TOKEN-WALLET-1',
      redirect_url: 'https://paytech.sn/payment/PAYTECH-TOKEN-WALLET-1',
    });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId, montant: 15000, type: 'acompte', moyen: 'wave' });
    expect(res.status).toBe(201);

    mockVerifyIpnSignature.mockReturnValueOnce(true);
    const ipnRes = await request(app)
      .post('/api/v1/payments/paytech/ipn')
      .send({
        type_event: 'sale_complete',
        custom_field: JSON.stringify({ paymentId: res.body.id, type: 'commande' }),
      });
    expect(ipnRes.status).toBe(200);

    const walletRes = await request(app)
      .get('/api/v1/artisans/wallet')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(walletRes.status).toBe(200);
    expect(walletRes.body.solde).toBe(15000);
    expect(walletRes.body.transactions).toHaveLength(1);
    expect(walletRes.body.transactions[0].type).toBe('credit');
  });

  it("3. Ne crédite pas le wallet pour des frais de service (revenu plateforme)", async () => {
    mockInitiatePayment.mockResolvedValueOnce({
      success: 1,
      token: 'PAYTECH-TOKEN-WALLET-2',
      redirect_url: 'https://paytech.sn/payment/PAYTECH-TOKEN-WALLET-2',
    });

    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId, montant: 1000, type: 'frais_service', moyen: 'free_money' });
    expect(res.status).toBe(201);

    mockVerifyIpnSignature.mockReturnValueOnce(true);
    const ipnRes = await request(app)
      .post('/api/v1/payments/paytech/ipn')
      .send({
        type_event: 'sale_complete',
        custom_field: JSON.stringify({ paymentId: res.body.id, type: 'commande' }),
      });
    expect(ipnRes.status).toBe(200);

    const walletRes = await request(app)
      .get('/api/v1/artisans/wallet')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(walletRes.body.solde).toBe(15000);
  });

  it('4. Refuse une demande de retrait supérieure au solde disponible', async () => {
    const res = await request(app)
      .post('/api/v1/artisans/wallet/retrait')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ montant: 50000, moyenPaiement: 'wave' });
    expect(res.status).toBe(400);
  });

  it('5. Refuse un retrait par un moyen sans numéro enregistré', async () => {
    const res = await request(app)
      .post('/api/v1/artisans/wallet/retrait')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ montant: 5000, moyenPaiement: 'orange_money' });
    expect(res.status).toBe(400);
  });

  it('6. Crée une demande de retrait valide et réserve le montant', async () => {
    const res = await request(app)
      .post('/api/v1/artisans/wallet/retrait')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ montant: 10000, moyenPaiement: 'wave' });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('en_attente');
    expect(res.body.numeroReception).toBe('771234567');
    retraitId = res.body.id;

    const walletRes = await request(app)
      .get('/api/v1/artisans/wallet')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(walletRes.body.solde).toBe(5000);
  });

  it("7. L'admin liste les demandes de retrait en attente", async () => {
    const res = await request(app)
      .get('/api/v1/admin/wallet/retraits?statut=en_attente')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(retraitId);
  });

  it("8. L'admin valide le retrait (fonds envoyés manuellement)", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/wallet/retraits/${retraitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'valide' });
    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('valide');
    expect(res.body.traiteAt).not.toBeNull();
  });

  it('9. Refuse de retraiter une demande déjà traitée', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/wallet/retraits/${retraitId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'rejete' });
    expect(res.status).toBe(400);
  });

  it('10. Un retrait rejeté recrédite le solde disponible', async () => {
    const newRetrait = await request(app)
      .post('/api/v1/artisans/wallet/retrait')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ montant: 5000, moyenPaiement: 'wave' });
    expect(newRetrait.status).toBe(201);

    let walletRes = await request(app)
      .get('/api/v1/artisans/wallet')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(walletRes.body.solde).toBe(0);

    const rejectRes = await request(app)
      .patch(`/api/v1/admin/wallet/retraits/${newRetrait.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'rejete', commentaireAdmin: 'Numéro invalide' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.statut).toBe('rejete');

    walletRes = await request(app)
      .get('/api/v1/artisans/wallet')
      .set('Authorization', `Bearer ${artisanToken}`);
    expect(walletRes.body.solde).toBe(5000);
  });
});
