# ModèlePro — Backend API V1

Node.js · Express · TypeScript · Sequelize · PostgreSQL (SQLite en test)

---

## 🚀 Démarrage rapide

```bash
npm install
npm run dev        # Développement (ts-node-dev, hot-reload sur http://localhost:5000)
npm run build      # Compilation TypeScript → dist/
npm start          # Production (node dist/server.js)
npm test           # Tests automatisés Jest (12 suites, 98 tests, 100% PASS)
```

---

## 📊 État du Projet & Couverture (V1)

- **Fonctionnalités V1 :** **79 / 79 (100% Implémenté & Validé)**
- **Suites de tests Jest :** **12 / 12 (PASS)**
- **Tests d'intégration :** **98 / 98 (PASS)**

---

## 🔑 Variables d'environnement — `.env`

Créer un fichier `.env` à la racine du projet :

```env
# Serveur
PORT=5000
NODE_ENV=development

# JWT
JWT_SECRET=remplace_par_une_cle_secrete_longue_et_aleatoire

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=modelpro
DB_USER=postgres
DB_PASSWORD=ton_mot_de_passe
```

> En mode `test` (ou si `JEST_WORKER_ID` est détecté), la base de données bascule automatiquement sur **SQLite in-memory** — aucune configuration PostgreSQL requise pour exécuter `npm test`.

---

## 📡 Endpoints API — `BASE : /api/v1`

### 🔐 Authentification & Push FCM — `authController` / `userController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/auth/register` | Public | Inscription (client ou artisan avec horaires et zone) |
| `POST` | `/auth/login` | Public | Connexion → retourne JWT |
| `GET` | `/users/me` | Connecté | Profil de l'utilisateur connecté |
| `PUT` | `/users/me` | Connecté | Mettre à jour profil (nom, téléphone, photoUrl, localisation) |
| `PATCH` | `/users/fcm-token` | Connecté | Enregistrer le token de notification Push FCM (`fcmToken`) |

---

### 👗 Catalogue & Créations — `modelController` / `clientController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/metiers` | Public | Liste des métiers disponibles |
| `GET` | `/artisans` | Public | Liste des artisans validés avec filtres (recherche, métier, zone) |
| `GET` | `/artisans/:id` | Public | Profil public détaillé d'un artisan (noteMoyenne, nombreAvis, catalogue) |
| `GET` | `/artisans/:artisanId/reviews` | Public | Liste des avis et commentaires d'un artisan |
| `GET` | `/models` | Public | Catalogue public avec filtres (search, metierId, minPrice, maxPrice, pagination) |
| `GET` | `/models/:id` | Public | Détail d'un modèle |
| `POST` | `/models` | Artisan | Ajouter une création au catalogue (avec delaiEstime, options, photos) |
| `PUT` | `/models/:id` | Artisan | Modifier un modèle existant |
| `GET` | `/models/my-models` | Artisan | Mes créations |
| `DELETE` | `/models/:id` | Artisan | Supprimer une création |

---

### 📅 Rendez-vous — `clientController` / `artisanDashboardController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/appointments` | Client | Demander un rendez-vous (date, heure, notes) |
| `GET` | `/appointments/my-appointments` | Client | Liste de mes rendez-vous |
| `PATCH` | `/appointments/:id/cancel` | Client | Annuler un rendez-vous |
| `GET` | `/artisans/appointments` | Artisan | Mes rendez-vous reçus |
| `PATCH` | `/artisans/appointments/:id/status` | Artisan | Accepter ou Refuser un RDV avec motif (`motifRefus`) |
| `PATCH` | `/artisans/appointments/:id/reschedule`| Artisan | Reporter un RDV (proposer une nouvelle date) |

---

### 📦 Commandes — `clientController` / `artisanDashboardController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/orders` | Client | Demander une commande (modèle, couleur, taille, matière, consignes) |
| `GET` | `/orders/my-orders` | Client | Historique de mes commandes |
| `PATCH` | `/orders/:id/cancel` | Client | Annuler une commande avec motif (`motifAnnulation`) |
| `GET` | `/artisans/orders` | Artisan | Mes commandes reçues |
| `GET` | `/artisans/orders/:id` | Artisan | Détail d'une commande |
| `PATCH` | `/artisans/orders/:id/status` | Artisan | Mettre à jour le statut (`en_attente`, `acceptee`, `en_cours`, `livree`...) |
| `PATCH` | `/artisans/orders/:id/delivery-date` | Artisan | Mettre à jour la date de réception estimée + motif |
| `PATCH` | `/artisans/orders/:id/payment` | Artisan | Mettre à jour le statut et montant de l'acompte |

---

### 💳 Paiements — `paymentController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/payments` | Client | Enregistrer un paiement (`orderId`, `montant`, `type`: acompte/solde, `moyen`: wave/om/carte) |
| `GET` | `/payments/order/:orderId` | Connecté | Liste des transactions de paiement d'une commande |

---

### ⭐️ Avis & Litiges — `clientController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/reviews` | Client | Noter un artisan (**5 sous-notes** : qualité, délai, comm, prix, pro) si commande livrée |
| `POST` | `/claims` | Client | Soumettre une réclamation/litige |
| `GET` | `/claims/my-claims` | Client | Historique de mes réclamations |

---

### 💬 Messagerie & Notifications — `messageController` / `notificationController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `POST` | `/messages` | Connecté | Envoyer un message (texte ou photo `multipart/form-data`) |
| `GET` | `/messages/order/:orderId` | Connecté | Historique d'une conversation liée à une commande |
| `GET` | `/messages/conversations` | Connecté | Liste de toutes mes conversations |
| `PATCH` | `/messages/:id/read` | Connecté | Marquer un message comme lu |
| `GET` | `/notifications` | Connecté | Mes notifications in-app |
| `PATCH` | `/notifications/:id/read` | Connecté | Marquer une notification comme lue |
| `PATCH` | `/notifications/read-all` | Connecté | Marquer toutes mes notifications comme lues |

---

### 🛡️ Administration Back-Office — `adminController`
| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| `GET` | `/admin/users` | Admin | Liste complète des utilisateurs enregistrés |
| `PATCH` | `/admin/users/:id/status` | Admin | Activer ou Suspendre un compte utilisateur (`actif` / `suspendu`) |
| `GET` | `/admin/pending-artisans` | Admin | Liste des artisans en attente de validation |
| `PATCH` | `/admin/artisans/:id/verify` | Admin | Approuver un profil artisan + notification |
| `PATCH` | `/admin/artisans/:id/reject` | Admin | Rejeter un profil artisan avec motif + notification |
| `GET` | `/admin/orders` | Admin | Liste de toutes les commandes de la plateforme |
| `DELETE` | `/admin/models/:id` | Admin | Supprimer définitivement une création |
| `GET` | `/admin/claims` | Admin | Liste de toutes les réclamations |
| `PATCH` | `/admin/claims/:id/status` | Admin | Statut de réclamation (`en_attente`, `en_cours`, `resolu`, `rejete`) |
| `POST` | `/admin/metiers` | Admin | Créer un métier |
| `PUT` | `/admin/metiers/:id` | Admin | Modifier un métier |
| `DELETE`| `/admin/metiers/:id` | Admin | Supprimer un métier |
| `GET` | `/admin/stats` | Admin | Statistiques globales (users, artisans actifs, clients, commandes, claims, CA) |

---

## 🗂️ Structure du projet

```
src/
├── app.ts                  # Application Express, middlewares & routage
├── server.ts               # Serveur HTTP & connexion database
├── config/database.ts      # Configuration Sequelize (PostgreSQL & SQLite in-memory pour Jest)
├── middlewares/
│   └── authMiddleware.ts   # protect() et restrictTo() — Sécurité JWT & rôles
├── models/                 # Modèles Sequelize (User, Artisan, Order, Payment, Review, Claim...)
├── controllers/            # Contrôleurs contenant la logique métier par domaine
├── routes/                 # Définition des routes Express par domaine
├── services/               # Services partagés (ex: notificationService.ts)
└── __tests__/              # 12 suites de tests automatisés (Jest & Supertest)
uploads/                    # Répertoire des fichiers statiques servis sous /uploads/
SPECIFICATIONS_FRONT_MOBILE.md  # Guide complet d'intégration Frontend & Mobile
```
