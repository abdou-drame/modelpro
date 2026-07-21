import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Metier } from '../models/Metier';
import { Claim } from '../models/Claim';
import { Order } from '../models/Order';
import { Artisan } from '../models/Artisan';
import { generateToken } from '../utils/auth';

let adminToken: string;
let clientId: number;
let metierId: number;
let claimId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const adminUser = await User.create({ nom: 'Admin', prenom: 'A', telephone: '001', password: 'pwd', role: 'admin' });
  adminToken = generateToken(adminUser.id, 'admin');

  const clientUser = await User.create({ nom: 'Client', prenom: 'C', telephone: '002', password: 'pwd', role: 'client' });
  clientId = clientUser.id;

  const metier = await Metier.create({ nom: 'Coiffeur' });
  metierId = metier.id;

  const artisanProfile = await Artisan.create({ userId: adminUser.id, métier: 'Coiffeur', atelier: 'A', localisation: 'D' });
  const order = await Order.create({ artisanId: artisanProfile.id, clientId, prix: 1000, statut: 'en_cours' });

  const claim = await Claim.create({ clientId, orderId: order.id, sujet: 'Test', statut: 'en_attente' });
  claimId = claim.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Phase 2 - Admin', () => {
  it('crée un métier', async () => {
    const res = await request(app)
      .post('/api/v1/admin/metiers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Styliste', description: 'Créateur' });

    expect(res.status).toBe(201);
    expect(res.body.nom).toBe('Styliste');
  });

  it('met à jour un métier', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/metiers/${metierId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nom: 'Coiffeur Pro' });

    expect(res.status).toBe(200);
    expect(res.body.nom).toBe('Coiffeur Pro');
  });

  it('supprime un métier', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/metiers/${metierId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('supprimé');
  });

  it('met à jour le statut dune réclamation', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/claims/${claimId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'en_cours' });

    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('en_cours');
  });

  it('refuse une mise à jour de réclamation avec un statut invalide', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/claims/${claimId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'invalide' });

    expect(res.status).toBe(400);
  });
});
