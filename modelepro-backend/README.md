# ModèlePro — Backend API

Node.js · Express · Sequelize · PostgreSQL (SQLite en test)

---

## 🚀 Démarrage rapide

```bash
npm install
npm run dev        # développement (ts-node-dev, hot-reload)
npm run build      # compilation TypeScript → dist/
npm start          # production (node dist/server.js)
npm test           # Jest (SQLite in-memory, --runInBand)
```

---

## 🔑 Variables d'environnement — `.env`

Créer `.env` à la racine du projet :

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

> En mode `test` (ou si `JEST_WORKER_ID` est détecté), la base bascule automatiquement sur **SQLite in-memory** — aucune config DB requise pour les tests.

---

## 📡 Routes API — `BASE : /api/v1`

### 🔐 Auth — `authController`
| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/auth/register` | Inscription (client ou artisan) |
| `POST` | `/auth/login` | Connexion → retourne JWT |

---

### 👤 Client & Utilisateur
| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/users/me` | Récupère le profil de l'utilisateur connecté |
| `PUT` | `/users/me` | Met à jour le profil (nom, téléphone, email...) |
| `GET` | `/metiers` | Liste les métiers d'artisans disponibles |
| `GET` | `/artisans/:id` | Profil public détaillé d'un artisan (avec catalogue / avis) |
| `GET` | `/models` | Catalogue public avec filtres (search, metierId, minPrice, maxPrice...) |
| `GET` | `/models/:id` | Détail d'une création |
| `POST` | `/appointments` | Prendre rendez-vous avec un artisan (avec `type`) |
| `POST` | `/orders` | Passer une commande |
| `GET` | `/orders/my-orders` | Mes commandes (client connecté) |
| `POST` | `/reviews` | Laisser un avis sur un artisan |
| `POST` | `/claims` | Soumettre une réclamation |

---

### 🧵 Artisan — Dashboard
| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/models` | Créer une création (photo Multer) |
| `GET` | `/models/my-models` | Mes créations |
| `DELETE` | `/models/:id` | Supprimer une de mes créations |
| `GET` | `/artisans/appointments` | Mes rendez-vous |
| `PATCH` | `/artisans/appointments/:id/status` | Changer le statut d'un RDV |
| `PATCH` | `/artisans/appointments/:id/reschedule`| Reporter un RDV (proposer une nouvelle date) |
| `GET` | `/artisans/orders` | Mes commandes reçues |
| `GET` | `/artisans/orders/:id` | Détail d'une commande |
| `PATCH` | `/artisans/orders/:id/status` | Changer le statut d'une commande |
| `PATCH` | `/artisans/orders/:id/delivery-date` | Mettre à jour la date de réception + motif |
| `PATCH` | `/artisans/orders/:id/payment` | Gérer le paiement et l'acompte |
| `GET` | `/artisans/stats` | Statistiques (revenus, commandes, notes) |

---

### 💬 Messagerie — `messageController`
| Méthode | Route | Rôle |
|---------|-------|------|
| `POST` | `/messages` | Envoyer un message (texte ou photo `multipart/form-data`, champ `photo`) |
| `GET` | `/messages/order/:orderId` | Historique d'une discussion (trié par date) |

> Crée automatiquement une **Notification** `nouveau_message` pour le destinataire.

---

### 🔔 Notifications — `notificationController`
| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/notifications` | Mes notifications (non lues en tête) |
| `PATCH` | `/notifications/:id/read` | Marquer une notification comme lue |

---

### 🛡️ Admin — Dashboard
| Méthode | Route | Rôle |
|---------|-------|------|
| `GET` | `/admin/pending-artisans` | Artisans en attente de validation |
| `PATCH` | `/admin/artisans/:id/verify` | Valider un artisan |
| `DELETE` | `/admin/models/:id` | Supprimer une création |
| `GET` | `/admin/claims` | Liste des réclamations |
| `PATCH` | `/admin/claims/:id/status` | Gérer le statut d'une réclamation (attente, résolu, rejeté...) |
| `POST` | `/admin/metiers` | Créer une nouvelle catégorie de métier |
| `PUT` | `/admin/metiers/:id` | Modifier une catégorie de métier existante |
| `DELETE`| `/admin/metiers/:id` | Supprimer une catégorie de métier |
| `GET` | `/admin/stats` | Statistiques globales de la plateforme |

---

## 🗂️ Structure du projet

```
src/
├── app.ts                  # Express + routes
├── server.ts               # listen()
├── config/database.ts      # Sequelize (PG / SQLite auto)
├── middlewares/
│   └── authMiddleware.ts   # protect() — vérifie JWT
├── models/                 # User, Artisan, Order, Message, Notification…
├── controllers/            # un fichier par domaine
├── routes/                 # un fichier par domaine
└── __tests__/              # Jest — supertest
    └── fixtures/test-image.png
uploads/                    # photos uploadées (créé auto au démarrage)
```
