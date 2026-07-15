import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';
import { Order } from '../models/Order';
import { Claim } from '../models/Claim';
import { generateToken } from '../utils/auth';

let adminToken: string;
let clientToken: string;
let artisanToken: string;
let pendingArtisanId: number;
let pendingArtisanUserId: number;
let creationId: number;
let orderId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const adminUser = await User.create({
    nom: 'Admin',
    prenom: 'Test',
    telephone: '770000000',
    email: 'admin@test.com',
    password: 'Iniesta99',
    role: 'admin',
    statut: 'actif',
  });

  const clientUser = await User.create({
    nom: 'Client',
    prenom: 'Test',
    telephone: '770000001',
    email: 'client@test.com',
    password: 'password',
    role: 'client',
    statut: 'actif',
  });

  const artisanUser = await User.create({
    nom: 'Artisan',
    prenom: 'Test',
    telephone: '770000002',
    email: 'artisan@test.com',
    password: 'password',
    role: 'artisan',
    statut: 'actif',
  });

  const pendingArtisanProfile = await Artisan.create({
    userId: artisanUser.id,
    métier: 'Tailleur',
    atelier: 'Atelier A',
    localisation: 'Dakar',
    statutValidation: 'en_attente',
  });

  pendingArtisanId = pendingArtisanProfile.id;
  pendingArtisanUserId = artisanUser.id;

  const creation = await Creation.create({
    artisanId: pendingArtisanId,
    titre: 'Modèle à supprimer',
    description: 'Modèle test',
    prixEstimatif: 15000,
  });
  creationId = creation.id;

  const order = await Order.create({
    artisanId: pendingArtisanId,
    clientId: clientUser.id,
    mesures: 'Taille L',
    prix: 25000,
    statut: 'en_cours',
  });
  orderId = order.id;

  await Claim.create({
    orderId,
    clientId: clientUser.id,
    sujet: 'Retard',
    description: 'La commande est en retard',
    statut: 'en_attente',
  });

  adminToken = generateToken(adminUser.id, 'admin');
  clientToken = generateToken(clientUser.id, 'client');
  artisanToken = generateToken(artisanUser.id, 'artisan');
});

afterAll(async () => {
  await sequelize.close();
});

describe('Back-office administration', () => {
  it('refuse l’accès aux routes admin sans authentification, pour un client et pour un artisan', async () => {
    const routes = [
      { method: 'get', path: '/api/v1/admin/pending-artisans' },
      { method: 'patch', path: '/api/v1/admin/artisans/1/verify' },
      { method: 'delete', path: '/api/v1/admin/models/1' },
      { method: 'get', path: '/api/v1/admin/claims' },
      { method: 'get', path: '/api/v1/admin/stats' },
    ];

    for (const route of routes) {
      const noAuthResponse = await (request(app) as any)[route.method](route.path);
      expect([401, 403]).toContain(noAuthResponse.status);
    }

    for (const route of routes) {
      const clientResponse = await (request(app) as any)[route.method](route.path)
        .set('Authorization', `Bearer ${clientToken}`);
      expect([401, 403]).toContain(clientResponse.status);
    }

    for (const route of routes) {
      const artisanResponse = await (request(app) as any)[route.method](route.path)
        .set('Authorization', `Bearer ${artisanToken}`);
      expect([401, 403]).toContain(artisanResponse.status);
    }
  });

  it('permet à l’administrateur de lister les artisans en attente', async () => {
    const response = await request(app)
      .get('/api/v1/admin/pending-artisans')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.some((item: any) => item.id === pendingArtisanUserId)).toBe(true);
  });

  it('permet à l’administrateur de valider un artisan en attente', async () => {
    const response = await request(app)
      .patch(`/api/v1/admin/artisans/${pendingArtisanUserId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/validé/i);
  });

  it('permet à l’administrateur de supprimer définitivement un modèle', async () => {
    const response = await request(app)
      .delete(`/api/v1/admin/models/${creationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect([200, 204]).toContain(response.status);
  });

  it('permet à l’administrateur de lire les réclamations et les statistiques', async () => {
    const claimsResponse = await request(app)
      .get('/api/v1/admin/claims')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(claimsResponse.status).toBe(200);
    expect(Array.isArray(claimsResponse.body)).toBe(true);

    const statsResponse = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(statsResponse.status).toBe(200);
    expect(statsResponse.body).toHaveProperty('totalArtisansActifs');
    expect(statsResponse.body).toHaveProperty('totalClients');
    expect(statsResponse.body).toHaveProperty('totalCommandes');
    expect(statsResponse.body).toHaveProperty('chiffreAffairesTotal');
  });
});
