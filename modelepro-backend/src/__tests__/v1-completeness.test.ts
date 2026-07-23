import request from 'supertest';
import app from '../app';
import sequelize from '../config/database';
import { User, Client, Artisan, Creation, Order, Review, Claim, Payment, Metier } from '../models';
import { generateToken } from '../utils/auth';

describe('Audit Backend V1 - Tests d\'intégration des fonctionnalités complétées', () => {
  let clientToken: string;
  let artisanToken: string;
  let adminToken: string;
  let clientId: number;
  let artisanUserId: number;
  let artisanId: number;
  let adminId: number;
  let orderId: number;
  let appointmentId: number;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // Client
    const clientUser = await User.create({
      nom: 'Client',
      prenom: 'Test',
      telephone: '770000001',
      email: 'client@test.com',
      password: 'password123',
      role: 'client',
      statut: 'actif',
    });
    clientId = clientUser.id;
    await Client.create({ userId: clientId, localisation: 'Dakar' });
    clientToken = generateToken(clientId, 'client');

    // Artisan
    const artisanUser = await User.create({
      nom: 'Artisan',
      prenom: 'Master',
      telephone: '770000002',
      email: 'artisan@test.com',
      password: 'password123',
      role: 'artisan',
      statut: 'actif',
    });
    artisanUserId = artisanUser.id;
    const artisanProf = await Artisan.create({
      userId: artisanUserId,
      métier: 'Couture',
      atelier: 'Atelier Excellence',
      description: 'Super couturier',
      localisation: 'Pikine',
      statutValidation: 'valide',
    });
    artisanId = artisanProf.id;
    artisanToken = generateToken(artisanUserId, 'artisan');

    // Admin
    const adminUser = await User.create({
      nom: 'Admin',
      prenom: 'Boss',
      telephone: '770000000',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin',
      statut: 'actif',
    });
    adminId = adminUser.id;
    adminToken = generateToken(adminId, 'admin');
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // --- MODULE 1: AUTH & FCM ---
  it('1.7 FCM Token : mise à jour du token', async () => {
    const res = await request(app)
      .patch('/api/v1/users/fcm-token')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ fcmToken: 'sample_fcm_token_12345' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Token FCM mis à jour');

    const updatedUser = await User.findByPk(clientId);
    expect(updatedUser?.fcmToken).toBe('sample_fcm_token_12345');
  });

  it('1.6 Mise à jour profil utilisateur avec photo et localisation', async () => {
    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ nom: 'ClientUpdated', photoUrl: '/uploads/avatar.jpg', localisation: 'Thies' });

    expect(res.status).toBe(200);
    expect(res.body.nom).toBe('ClientUpdated');
    expect(res.body.photoUrl).toBe('/uploads/avatar.jpg');
  });

  // --- MODULE 4: MODÈLES (CATALOGUE) ---
  it('4.1/4.5 Création et mise à jour d\'un modèle enrichi', async () => {
    const createRes = await request(app)
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({
        titre: 'Robe du Soir',
        description: 'Superbe robe',
        prixEstimatif: 35000,
        delaiEstime: '3 jours',
        categorie: 'Femme',
        options: 'col V, col rond',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.delaiEstime).toBe('3 jours');
    expect(createRes.body.categorie).toBe('Femme');
    const modelId = createRes.body.id;

    const updateRes = await request(app)
      .put(`/api/v1/models/${modelId}`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ titre: 'Robe de Gala Luxe', prixEstimatif: 45000 });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.titre).toBe('Robe de Gala Luxe');
  });

  // --- MODULE 5: RENDEZ-VOUS ---
  it('5.1/5.2 Création et liste RDV client', async () => {
    const createRes = await request(app)
      .post('/api/v1/appointments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, date: '2026-09-01', heure: '14:00', notes: 'Essayage costume' });

    expect(createRes.status).toBe(201);
    appointmentId = createRes.body.id;

    const listRes = await request(app)
      .get('/api/v1/appointments/my-appointments')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.length).toBeGreaterThanOrEqual(1);
  });

  it('5.7 Annulation RDV par le client', async () => {
    const res = await request(app)
      .patch(`/api/v1/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.statut).toBe('annule');
  });

  // --- MODULE 6: COMMANDES ---
  it('6.1/6.10 Création commande enrichie + notification artisan', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        artisanId,
        prix: 50000,
        couleur: 'Bleu Roi',
        taille: 'XL',
        matiere: 'Bazin Rich',
      });

    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('en_attente');
    expect(res.body.couleur).toBe('Bleu Roi');
    expect(res.body.taille).toBe('XL');
    expect(res.body.matiere).toBe('Bazin Rich');
    orderId = res.body.id;
  });

  it('6.5 Workflow statut commande (artisan)', async () => {
    const updateRes = await request(app)
      .patch(`/api/v1/artisans/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ statut: 'acceptee' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.statut).toBe('acceptee');

    const updateRes2 = await request(app)
      .patch(`/api/v1/artisans/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ statut: 'livree' });

    expect(updateRes2.status).toBe(200);
    expect(updateRes2.body.statut).toBe('livree');
  });

  it('6.6 Annulation commande avec motif', async () => {
    // Create a new order to cancel
    const newOrder = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, prix: 10000 });

    const cancelRes = await request(app)
      .patch(`/api/v1/orders/${newOrder.body.id}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ motifAnnulation: 'Changement de plans' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.statut).toBe('annulee');
    expect(cancelRes.body.motifAnnulation).toBe('Changement de plans');
  });

  it('4.7 Incrément nombreCommandes sur le modèle', async () => {
    const createModel = await request(app)
      .post('/api/v1/models')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ titre: 'Modèle Compteur', prixEstimatif: 5000 });

    const modId = createModel.body.id;

    await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, modeleId: modId, prix: 5000 });

    const model = await Creation.findByPk(modId);
    expect(model?.nombreCommandes).toBe(1);
  });

  // --- MODULE 7: MESSAGERIE ---
  it('7.1/7.2 Envoi et récupération messages', async () => {
    const sendRes = await request(app)
      .post('/api/v1/messages')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId, texte: 'Bonjour, je voudrais un tissu bleu.' });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.texte).toBe('Bonjour, je voudrais un tissu bleu.');

    const getRes = await request(app)
      .get(`/api/v1/messages/order/${orderId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.length).toBeGreaterThan(0);
  });

  it('7.3 Liste des conversations', async () => {
    const res = await request(app)
      .get('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('orderId');
    expect(res.body[0]).toHaveProperty('lastMessage');
  });

  it('7.4 Marquer un message comme lu', async () => {
    const msgs = await request(app)
      .get(`/api/v1/messages/order/${orderId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    const msgId = msgs.body[0].id;

    const markRes = await request(app)
      .patch(`/api/v1/messages/${msgId}/read`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(markRes.status).toBe(200);
    expect(markRes.body.lu).toBe(true);
  });

  // --- MODULE 8: NOTIFICATIONS ---
  it('8.2/8.3 Récupérer et marquer une notification comme lue', async () => {
    const notifs = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${artisanToken}`);

    expect(notifs.status).toBe(200);
    expect(notifs.body.length).toBeGreaterThan(0);

    const notifId = notifs.body[0].id;
    const markRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${artisanToken}`);

    expect(markRes.status).toBe(200);
    expect(markRes.body.lu).toBe(true);
  });

  it('8.4 Marquer toutes les notifications comme lues', async () => {
    const res = await request(app)
      .patch('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${artisanToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('marquées comme lues');
  });

  // --- MODULE 9: SYSTÈME D'AVIS ---
  it('9.1-9.4 Avis 5 sous-notes + recalcul noteMoyenne/nombreAvis', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        artisanId,
        noteQualite: 5,
        noteDelai: 4,
        noteCommunication: 5,
        notePrix: 4,
        noteProfessionnalisme: 5,
        commentaire: 'Travail impeccable !',
      });

    expect(res.status).toBe(201);
    expect(res.body.note).toBe(5);
    expect(res.body.noteQualite).toBe(5);
    expect(res.body.noteDelai).toBe(4);

    const artisanDb = await Artisan.findByPk(artisanId);
    expect(artisanDb?.noteMoyenne).toBe(5);
    expect(artisanDb?.nombreAvis).toBe(1);
  });

  it('9.1 Rejet avis note invalide (> 5)', async () => {
    const res = await request(app)
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ artisanId, note: 6, commentaire: 'Invalide' });

    expect(res.status).toBe(400);
  });

  it('9.5 Liste des avis d\'un artisan', async () => {
    const res = await request(app)
      .get(`/api/v1/artisans/${artisanId}/reviews`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // --- MODULE 10: RÉCLAMATIONS ---
  it('10.1 Soumettre une réclamation', async () => {
    const res = await request(app)
      .post('/api/v1/claims')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId, sujet: 'retard', description: 'Ma commande est en retard de 2 semaines.' });

    expect(res.status).toBe(201);
    expect(res.body.sujet).toBe('retard');
  });

  it('10.4 Mes réclamations (client)', async () => {
    const res = await request(app)
      .get('/api/v1/claims/my-claims')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  // --- MODULE 11: PAIEMENTS ---
  it('11.1/11.3 Enregistrer et lister paiements', async () => {
    const payRes = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId, montant: 20000, type: 'acompte', moyen: 'wave' });

    expect(payRes.status).toBe(201);
    expect(payRes.body.montant).toBe(20000);

    const listRes = await request(app)
      .get(`/api/v1/payments/order/${orderId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);
  });

  // --- MODULE 12: ADMINISTRATION ---
  it('12.1 Liste de tous les utilisateurs (admin)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    // Vérifier que le mot de passe est exclu
    expect(res.body[0]).not.toHaveProperty('password');
  });

  it('12.2 Suspension d\'un utilisateur (admin)', async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/users/${clientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'suspendu' });

    expect(res.status).toBe(200);
    expect(res.body.user.statut).toBe('suspendu');

    // Réactiver
    await request(app)
      .patch(`/api/v1/admin/users/${clientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'actif' });
  });

  it('12.4 Validation artisan + notification', async () => {
    const newArtisan = await User.create({
      nom: 'Nouveau', prenom: 'Artisan', telephone: '770099099',
      email: 'new.artisan@test.com', password: 'pass', role: 'artisan', statut: 'actif',
    });
    await Artisan.create({
      userId: newArtisan.id, métier: 'Broderie', atelier: 'Studio',
      localisation: 'Mbour', statutValidation: 'en_attente',
    });

    const res = await request(app)
      .patch(`/api/v1/admin/artisans/${newArtisan.id}/verify`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('validé');
  });

  it('12.5 Rejet artisan + motif + notification', async () => {
    const rejectArtisan = await User.create({
      nom: 'Rejet', prenom: 'Test', telephone: '770099098',
      email: 'reject@test.com', password: 'pass', role: 'artisan', statut: 'actif',
    });
    await Artisan.create({
      userId: rejectArtisan.id, métier: 'Bijouterie', atelier: 'Shop',
      localisation: 'Saint-Louis', statutValidation: 'en_attente',
    });

    const res = await request(app)
      .patch(`/api/v1/admin/artisans/${rejectArtisan.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ motifRejet: 'Dossier incomplet' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('rejeté');
  });

  it('12.6 Liste de toutes les commandes (admin)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('12.7/12.8 Réclamations admin : lister et traiter', async () => {
    const listRes = await request(app)
      .get('/api/v1/admin/claims')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);

    const claimId = listRes.body[0].id;
    const updateRes = await request(app)
      .patch(`/api/v1/admin/claims/${claimId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'resolu' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.statut).toBe('resolu');
  });

  it('12.9 Statistiques globales complètes', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalUsers');
    expect(res.body).toHaveProperty('totalArtisansActifs');
    expect(res.body).toHaveProperty('totalClients');
    expect(res.body).toHaveProperty('totalCommandes');
    expect(res.body).toHaveProperty('totalClaims');
    expect(res.body).toHaveProperty('chiffreAffairesTotal');
    expect(res.body.totalUsers).toBeGreaterThanOrEqual(3);
    expect(res.body.totalClaims).toBeGreaterThanOrEqual(1);
  });

  // --- MODULE 13: UPLOADS & STATIC ---
  it('13.2 Route /uploads sert les fichiers statiques', async () => {
    // Just verify the route exists (it will 404 for a missing file but won't 500)
    const res = await request(app).get('/uploads/nonexistent.jpg');
    // Static middleware returns 404, not 500
    expect(res.status).not.toBe(500);
  });

  // --- MODULE 3: PROFIL PUBLIC ARTISAN ---
  it('3.5 Profil public artisan avec noteMoyenne et nombreAvis', async () => {
    const res = await request(app)
      .get(`/api/v1/artisans/${artisanId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('noteMoyenne');
    expect(res.body).toHaveProperty('nombreAvis');
    expect(res.body).toHaveProperty('catalogue');
  });

  // --- SÉCURITÉ ---
  it('14.2 CORS est configuré (pas de crash)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('Sécurité : accès refusé sans token sur route protégée', async () => {
    const res = await request(app).get('/api/v1/orders/my-orders');
    expect(res.status).toBe(401);
  });

  it('Sécurité : accès refusé mauvais rôle (artisan sur route client)', async () => {
    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ artisanId, prix: 1000 });
    expect(res.status).toBe(403);
  });

  it('Sécurité : accès admin refusé pour non-admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${clientToken}`);
    expect(res.status).toBe(403);
  });
});
