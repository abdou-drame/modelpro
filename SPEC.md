# ModèlePro — Résumé du Projet

## Vue d'ensemble

ModèlePro est une place de marché mobile qui met en relation des **clients** avec des **artisans** (tailleurs, couturiers, artisans du textile) en Afrique de l'Ouest (contexte sénégalais : monnaie FCFA, paiements Wave / Orange Money / Free Money).

L'objectif est de digitaliser la relation client-artisan : de la découverte d'un artisan jusqu'à la livraison d'une commande, en passant par la prise de rendez-vous, le suivi de fabrication, la messagerie intégrée, les paiements et les avis.

---

## Acteurs & Rôles

| Rôle | Description |
|---|---|
| **Client** | Parcourt le catalogue, prend des RDV, passe des commandes, communique avec l'artisan, évalue et dépose des réclamations |
| **Artisan** | Gère son profil et son catalogue de modèles, reçoit et traite les commandes et RDV, communique avec ses clients, suit ses paiements |
| **Admin** | Valide les comptes artisans, modère le contenu, gère les litiges, consulte les statistiques globales de la plateforme |

---

## Architecture Technique (Backend existant)

| Couche | Choix |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express 5.x |
| Langage | TypeScript 5.4 |
| ORM | Sequelize 6 + sequelize-typescript |
| Base de données | PostgreSQL (prod) / SQLite in-memory (tests) |
| Auth | JWT (7 jours) + bcrypt (cost 10) |
| Fichiers | Multer — servis en statique sur `/uploads/` |
| Tests | Jest 29 + Supertest (98 tests, tous passants) |
| Déploiement | Render.com (Web Service + PostgreSQL + disque persistant) |

---

## Modèle de Données (12 entités)

```
users          — compte unifié (client / artisan / admin), login par téléphone
clients        — profil client étendu (localisation)
artisans       — profil artisan (métier, atelier, validation, abonnement, note)
metiers        — référentiel des catégories de métiers
creations      — modèles du catalogue (titre, photos, prix estimatif, options)
appointments   — rendez-vous client ↔ artisan (7 types, 8 statuts)
orders         — commandes (cycle de vie en 7 statuts, paiement en 3 états)
reviews        — avis (5 sous-notes : qualité, délai, communication, prix, professionnalisme)
claims         — réclamations liées à une commande
messages       — messagerie contextuelle par commande (texte + photo)
notifications  — journal de notifications in-app (7 types)
payments       — transactions (acompte / solde / intégral / abonnement, 4 moyens de paiement)
```

### Relations clés
- Un `User` a un profil `Client` OU un profil `Artisan`
- Un `Artisan` possède un catalogue de `Creation`s
- Une `Order` lie un `Client`, un `Artisan` et optionnellement une `Creation`
- Les `Message`s sont rattachés à une `Order` (chat contextuel)
- Un `Review` ne peut être posté que si une commande est au statut `livree`

---

## Cycle de vie d'une commande

```
en_attente → acceptee → en_cours → en_finition → prete → livree
                                                        ↘ annulee (à tout moment)
```

### Statuts de paiement associés
```
unpaid → deposit_paid (acompte confirmé) → fully_paid (solde confirmé)
```

---

## API — Résumé des endpoints

Préfixe commun : `POST /api/v1`

### Auth & Profil
- `POST /auth/register` — inscription client ou artisan
- `POST /auth/login` — connexion → JWT
- `GET / PUT /users/me` — profil connecté
- `PATCH /users/fcm-token` — token push FCM

### Catalogue & Artisans (Public)
- `GET /artisans/search` — recherche artisans validés (`metier`, `atelier`, `localisation`, `zone`)
- `GET /artisans/:id` — profil public artisan
- `GET /artisans/:id/reviews` — avis d'un artisan
- `GET /metiers` — référentiel des métiers
- `GET /models` — catalogue avec filtres (`search`, `metierId`, `artisanId`, `minPrice`, `maxPrice`, `page`, `limit`)
- `GET /models/:id` — détail d'un modèle

### Espace Client
- `POST /appointments` — prise de RDV
- `GET /appointments/my-appointments` — mes RDV
- `PATCH /appointments/:id/cancel` — annuler un RDV
- `POST /orders` — passer une commande
- `GET /orders/my-orders` — mes commandes
- `PATCH /orders/:id/cancel` — annuler une commande
- `POST /reviews` — déposer un avis
- `POST /claims` / `GET /claims/my-claims` — réclamations

### Espace Artisan
- `GET/PUT /artisans/profile` — profil artisan (⚠ backend : `/profile`, spec : `/me`)
- `GET /artisans/stats` — tableau de bord (revenus, commandes actives, note)
- `GET/POST/PUT/DELETE /models/my-models` — gestion catalogue
- `GET /artisans/orders` / `GET /artisans/orders/:id` — commandes reçues
- `PATCH /artisans/orders/:id/status` — avancement fabrication
- `PATCH /artisans/orders/:id/payment` — paiement
- `PATCH /artisans/orders/:id/delivery-date` — date de livraison
- `GET /artisans/appointments` — RDV reçus
- `PATCH /artisans/appointments/:id/status` — accepter / refuser
- `PATCH /artisans/appointments/:id/reschedule` — reporter

### Messagerie & Notifications
- `POST /messages` — envoyer (multipart/form-data)
- `GET /messages/conversations` — toutes les conversations
- `GET /messages/order/:orderId` — historique d'une commande
- `GET /notifications` / `PATCH /notifications/:id/read` / `PATCH /notifications/read-all`

### Paiements
- `POST /payments` — enregistrer (Wave, OM, Free Money, espèces)
- `GET /payments/order/:orderId` — paiements d'une commande
- `GET /payments/summary/:orderId` — résumé financier
- `GET /payments/subscriptions/my` — abonnement artisan
- `PATCH /payments/:id/status` — confirmer / échouer / rembourser

### Admin
- Stats, gestion utilisateurs, validation artisans, modération catalogue, suivi commandes/RDV/réclamations, référentiel métiers

---

## Points de vigilance (écarts spec ↔ backend réel)

| Point | Spec frontend | Backend réel |
|---|---|---|
| Profil artisan | `GET /artisans/me` | `GET /artisans/profile` |
| Liste artisans publique | `GET /artisans` | `GET /artisans/search` |
| Secret JWT | Variable d'env `.env` | Littéral hard-codé (à corriger avant prod) |
| Messagerie temps réel | "Chat en direct" (spec) | REST polling uniquement (pas de WebSocket) |
| Expiration abonnement | Enforced automatiquement | Manuel / via paiement uniquement (V1) |

---

## État du projet

| Composant | État |
|---|---|
| Backend API | Complet, testé (98 tests), prêt pour déploiement |
| Base de données | Schéma finalisé |
| Documentation API | Complète (`SPECIFICATIONS_FRONT_MOBILE.md`) |
| Application mobile | **Non démarrée** |
| Back-office web admin | Non démarré |
