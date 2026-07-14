import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';
import { Metier } from '../models/Metier';
import { Order } from '../models/Order';
import { generateToken } from '../utils/auth';

let artisanToken: string;
let clientToken: string;
let artisanId: number;
let creationId: number;
let deliveredOrderId: number;
let orderForClaimId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const artisanUser = await User.create({ nom: 'Artisan', prenom: 'Test', telephone: '0700000001', email: 'artisan@test.com', password: 'password', role: 'artisan', statut: 'actif' });
  const clientUser = await User.create({ nom: 'Client', prenom: 'Test', telephone: '0700000002', email: 'client@test.com', password: 'password', role: 'client', statut: 'actif' });

  const artisanProfile = await Artisan.create({ userId: artisanUser.id, métier: 'tailleur', atelier: 'Atelier 1', localisation: 'Dakar' });
  artisanId = artisanProfile.id;

  artisanToken = generateToken(artisanUser.id, 'artisan');
  clientToken = generateToken(clientUser.id, 'client');

  const metier = await Metier.create({ nom: 'Tailoring', description: 'Confection de vêtements' });

  const creation = await Creation.create({ artisanId, titre: 'Robe A', description: 'Tunique', prixEstimatif: 10000, photoUrl: 'img.jpg' });
  creationId = creation.id;

  const deliveredOrder = await Order.create({ artisanId, clientId: clientUser.id, mesures: 'M', photoTissu: 'url', consignes: 'Aucune', prix: 20000, statut: 'livree' });
  deliveredOrderId = deliveredOrder.id;

  const orderForClaim = await Order.create({ artisanId, clientId: clientUser.id, mesures: 'L', photoTissu: 'url2', consignes: 'urgent', prix: 30000, statut: 'en_cours' });
  orderForClaimId = orderForClaim.id;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Client app - étapes 15 à 22', () => {
  it('15. GET /metiers retourne la liste des métiers', async () => {
    const res = await request(app).get('/api/v1/metiers');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('16. GET /models retourne le catalogue', async () => {
    const res = await request(app).get('/api/v1/models');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('17. GET /models/:id retourne le détail du modèle avec artisan', async () => {
    const res = await request(app).get(`/api/v1/models/${creationId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', creationId);
    expect(res.body).toHaveProperty('artisan');
  });

  it('17. GET /models/:id renvoie 404 pour id inexistant', async () => {
    const res = await request(app).get('/api/v1/models/99999');
    expect(res.status).toBe(404);
  });

  it('18. POST /appointments créé un rendez-vous (client)', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, date: '2026-08-01', heure: '10:00', notes: 'Essayage' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('18. POST /appointments bloque sans token', async () => {
    const res = await request(app).post('/api/v1/appointments').send({ artisanId, date: '2026-08-01', heure: '10:00' });
    expect(res.status).toBe(401);
  });

  it('18. POST /appointments bloque pour un artisan', async () => {
    const res = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ artisanId, date: '2026-08-01', heure: '10:00' });
    expect(res.status).toBe(403);
  });

  it('19. POST /orders crée une commande (client)', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, mesures: 'XL', photoTissu: 'url3', consignes: 'soie', prix: 40000 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('20. GET /orders/my-orders retourne les commandes du client', async () => {
    const res = await request(app).get('/api/v1/orders/my-orders').set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((o: any) => o.id === deliveredOrderId)).toBe(true);
  });

  it('21. POST /reviews créé une évaluation valide', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, note: 5, commentaire: 'Excellent' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('21. POST /reviews refuse note invalide', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, note: 6, commentaire: 'Trop' });
    expect(res.status).toBe(400);
  });

  it('22. POST /claims crée une réclamation pour une commande du client', async () => {
    const res = await request(app)
      .post('/api/v1/claims')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId: orderForClaimId, sujet: 'Problème', description: 'Tissu abîmé' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });
});
