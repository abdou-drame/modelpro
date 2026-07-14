import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';
import { Order } from '../models/Order';
import { Review } from '../models/Review';
import { Appointment } from '../models/Appointment';
import { generateToken } from '../utils/auth';

let artisanToken: string;
let clientToken: string;
let artisanId: number;
let otherArtisanId: number;
let creationId: number;
let orderId: number;
let appointmentId: number;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  const artisanUser = await User.create({
    nom: 'Artisan',
    prenom: 'Test',
    telephone: '0700000001',
    email: 'artisan@test.com',
    password: 'password',
    role: 'artisan',
    statut: 'actif',
  });
  const anotherArtisanUser = await User.create({
    nom: 'Artisan',
    prenom: 'Other',
    telephone: '0700000002',
    email: 'artisan2@test.com',
    password: 'password',
    role: 'artisan',
    statut: 'actif',
  });
  const clientUser = await User.create({
    nom: 'Client',
    prenom: 'Test',
    telephone: '0700000003',
    email: 'client@test.com',
    password: 'password',
    role: 'client',
    statut: 'actif',
  });

  const artisanProfile = await Artisan.create({ userId: artisanUser.id, métier: 'tailleur', atelier: 'Atelier 1', localisation: 'Dakar' });
  const otherArtisanProfile = await Artisan.create({ userId: anotherArtisanUser.id, métier: 'couturier', atelier: 'Atelier 2', localisation: 'Dakar' });

  artisanId = artisanProfile.id;
  otherArtisanId = otherArtisanProfile.id;

  artisanToken = generateToken(artisanUser.id, 'artisan');
  clientToken = generateToken(clientUser.id, 'client');

  const creation = await Creation.create({ artisanId, titre: 'Robe A', description: 'Tunique', prixEstimatif: 10000 });
  creationId = creation.id;

  const order = await Order.create({ artisanId, clientId: clientUser.id, mesures: 'taille L', photoTissu: 'url', consignes: 'Aucune', prix: 25000, statut: 'en_cours' });
  orderId = order.id;

  const appointment = await Appointment.create({ artisanId, clientId: clientUser.id, statut: 'pending', notes: 'Visite' });
  appointmentId = appointment.id;

  await Review.create({ artisanId, clientId: clientUser.id, note: 5, commentaire: 'Très bien' });
});

afterAll(async () => {
  await sequelize.close();
});

describe('Espace Artisan - étapes 6 à 14', () => {
  describe('6. Ajout d\'un modèle au catalogue', () => {
    it('devrait créer un modèle avec un artisan authentifié', async () => {
      const response = await request(app)
        .post('/api/v1/models')
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ titre: 'Robe Test', description: 'Modèle test', prixEstimatif: 12000 });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.titre).toBe('Robe Test');
    });

    it('devrait refuser la création sans token', async () => {
      const response = await request(app)
        .post('/api/v1/models')
        .send({ titre: 'Robe Test', description: 'Modèle test', prixEstimatif: 12000 });

      expect(response.status).toBe(401);
    });

    it('devrait refuser la création si le rôle n\'est pas artisan', async () => {
      const response = await request(app)
        .post('/api/v1/models')
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ titre: 'Robe Test', description: 'Modèle test', prixEstimatif: 12000 });

      expect(response.status).toBe(403);
    });
  });

  describe('7. Liste des modèles de l\'artisan', () => {
    it('devrait retourner les modèles de l\'artisan connecté', async () => {
      const response = await request(app)
        .get('/api/v1/models/my-models')
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((item: any) => item.titre === 'Robe A')).toBe(true);
    });

    it('devrait refuser l\'accès sans token', async () => {
      const response = await request(app)
        .get('/api/v1/models/my-models');

      expect(response.status).toBe(401);
    });
  });

  describe('8. Suppression d\'un modèle du catalogue', () => {
    it('devrait supprimer un modèle appartenant à l\'artisan', async () => {
      const response = await request(app)
        .delete(`/api/v1/models/${creationId}`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toMatch(/supprimé/i);
    });

    it('devrait empêcher un artisan de supprimer le modèle d\'un autre artisan', async () => {
      const otherCreation = await Creation.create({ artisanId: otherArtisanId, titre: 'Robe Autre', prixEstimatif: 9000 });
      const response = await request(app)
        .delete(`/api/v1/models/${otherCreation.id}`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('9. Liste des demandes de rendez-vous artisan', () => {
    it('devrait retourner les rendez-vous de l\'artisan', async () => {
      const response = await request(app)
        .get('/api/v1/artisans/appointments')
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('client');
      expect(response.body[0].client).toHaveProperty('telephone');
    });

    it('devrait refuser l\'accès à un client', async () => {
      const response = await request(app)
        .get('/api/v1/artisans/appointments')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('10. Mise à jour du statut d\'un rendez-vous', () => {
    it('devrait mettre à jour le statut du rendez-vous', async () => {
      const response = await request(app)
        .patch(`/api/v1/artisans/appointments/${appointmentId}/status`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ statut: 'confirme' });

      expect(response.status).toBe(200);
      expect(response.body.statut).toBe('confirme');
    });

    it('devrait refuser la mise à jour sans token', async () => {
      const response = await request(app)
        .patch(`/api/v1/artisans/appointments/${appointmentId}/status`)
        .send({ statut: 'annule' });

      expect(response.status).toBe(401);
    });
  });

  describe('11. Liste des commandes reçues', () => {
    it('devrait retourner les commandes assignées à l\'artisan', async () => {
      const response = await request(app)
        .get('/api/v1/artisans/orders')
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0].artisanId).toBe(artisanId);
    });

    it('devrait refuser l\'accès à un client', async () => {
      const response = await request(app)
        .get('/api/v1/artisans/orders')
        .set('Authorization', `Bearer ${clientToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('12. Détail complet d\'une commande client', () => {
    it('devrait retourner les détails de la commande', async () => {
      const response = await request(app)
        .get(`/api/v1/artisans/orders/${orderId}`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(orderId);
      expect(response.body).toHaveProperty('mesures');
    });

    it('devrait empêcher l\'accès si la commande n\'appartient pas à l\'artisan', async () => {
      const otherOrder = await Order.create({ artisanId: otherArtisanId, clientId: 1, mesures: 'S', prix: 20000, statut: 'en_cours' });
      const response = await request(app)
        .get(`/api/v1/artisans/orders/${otherOrder.id}`)
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('13. Mise à jour du statut de fabrication', () => {
    it('devrait mettre à jour le statut de fabrication', async () => {
      const response = await request(app)
        .patch(`/api/v1/artisans/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${artisanToken}`)
        .send({ statut: 'en_finition' });

      expect(response.status).toBe(200);
      expect(response.body.statut).toBe('en_finition');
    });

    it('devrait refuser le changement de statut pour un client', async () => {
      const response = await request(app)
        .patch(`/api/v1/artisans/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({ statut: 'prete' });

      expect(response.status).toBe(403);
    });
  });

  describe('14. Statistiques du tableau de bord artisan', () => {
    it('devrait retourner les statistiques de l\'artisan', async () => {
      const response = await request(app)
        .get('/api/v1/artisans/stats')
        .set('Authorization', `Bearer ${artisanToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('chiffreAffaires');
      expect(response.body).toHaveProperty('commandesEnCours');
      expect(response.body).toHaveProperty('noteGlobale');
    });

    it('devrait refuser l\'accès sans authentification', async () => {
      const response = await request(app)
        .get('/api/v1/artisans/stats');

      expect(response.status).toBe(401);
    });
  });
});
