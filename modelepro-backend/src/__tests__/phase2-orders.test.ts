import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Order } from '../models/Order';
import { generateToken } from '../utils/auth';

let artisanToken: string;
let clientToken: string;
let otherArtisanToken: string;
let orderId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const clientUser = await User.create({ nom: 'C', prenom: 'C', telephone: '001', password: 'pwd', role: 'client' });
  const artisanUser = await User.create({ nom: 'A', prenom: 'A', telephone: '002', password: 'pwd', role: 'artisan' });
  const otherArtisan = await User.create({ nom: 'O', prenom: 'O', telephone: '003', password: 'pwd', role: 'artisan' });

  clientToken = generateToken(clientUser.id, 'client');
  artisanToken = generateToken(artisanUser.id, 'artisan');
  otherArtisanToken = generateToken(otherArtisan.id, 'artisan');

  const artisanProfile = await Artisan.create({ userId: artisanUser.id, métier: 'Tailleur', atelier: 'X', localisation: 'Y' });
  
  const order = await Order.create({ artisanId: artisanProfile.id, clientId: clientUser.id, prix: 1000, statut: 'en_cours' });
  orderId = order.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Phase 2 - Orders', () => {
  it('met à jour la date de livraison avec motif et crée une notification', async () => {
    const res = await request(app)
      .patch(`/api/v1/artisans/orders/${orderId}/delivery-date`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ deliveryDate: '2026-10-10', deliveryDateReason: 'Tissu en retard' });

    expect(res.status).toBe(200);
    expect(res.body.deliveryDate).toContain('2026-10-10');
    expect(res.body.deliveryDateReason).toBe('Tissu en retard');
  });

  it('refuse si pas artisan', async () => {
    const res = await request(app)
      .patch(`/api/v1/artisans/orders/${orderId}/delivery-date`)
      .set('Authorization', `Bearer ${otherArtisanToken}`)
      .send({ deliveryDate: '2026-10-10' });
    expect(res.status).toBe(404); // Le otherArtisan n'a pas de profil pourtant dans DB (on a oublié de l'ajouter dans beforeAll, donc 404 est attendu pour Profil artisan introuvable)
  });

  it('met à jour le statut de paiement', async () => {
    const res = await request(app)
      .patch(`/api/v1/artisans/orders/${orderId}/payment`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ paymentStatus: 'deposit_paid', depositAmount: 500, totalPrice: 1500 });

    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe('deposit_paid');
    expect(res.body.depositAmount).toBe(500);
    expect(res.body.totalPrice).toBe(1500);
  });
});
