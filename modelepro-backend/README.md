# ModèlePro Backend

## Présentation

Ce dépôt contient le backend de l'application ModèlePro en TypeScript avec Express et Sequelize.
Le projet gère l'authentification, l'inscription des utilisateurs, et la gestion des profils artisan.

## Structure principale

- `src/app.ts` : point d'entrée de l'application.
- `src/routes/authRoutes.ts` : routes d'inscription et de connexion.
- `src/routes/artisanRoutes.ts` : route artisan protégée par middleware.
- `src/middlewares/authMiddleware.ts` : middleware JWT pour protéger les routes.
- `src/utils/auth.ts` : génération et vérification des tokens JWT, hashage des mots de passe.
- `src/controllers/authController.ts` : logique d'inscription et de connexion.
- `src/controllers/artisanController.ts` : logique métier des artisans.
- `src/models/` : modèles Sequelize pour `User`, `Client`, `Artisan`, `Creation`.

## Installation

1. Ouvrir un terminal dans `modelepro-backend`
2. Installer les dépendances :

```bash
npm install
```

## Exécution

Pour lancer le serveur en développement :

```bash
npm run dev
```

## Routes principales

- `POST /api/v1/auth/register` : création de compte
- `POST /api/v1/auth/login` : connexion
- `PUT /api/v1/artisans/profile` : mise à jour du profil artisan (protégée par JWT)

## Routes API détaillées

Endpoints pour la v1 (base path: `/api/v1`)

- Auth
	- `POST /auth/register` : créer un compte
	- `POST /auth/login` : se connecter

- Modèles (protected, rôle `artisan`)
	- `POST /models` : ajouter un modèle au catalogue (artisan authentifié)
	- `GET /models/my-models` : lister les modèles de l'artisan connecté
	- `DELETE /models/:id` : supprimer un modèle (vérifie la propriété)

- Artisan - tableau de bord (protected, rôle `artisan`)
	- `GET /artisans/appointments` : lister les demandes de rendez-vous reçues
	- `PATCH /artisans/appointments/:id/status` : mettre à jour le statut d'un rendez-vous (`confirme` | `annule`)
	- `GET /artisans/orders` : lister les commandes reçues
	- `GET /artisans/orders/:id` : obtenir le détail complet d'une commande
	- `PATCH /artisans/orders/:id/status` : mettre à jour le statut de fabrication (`en_cours` | `en_finition` | `prete` | `livree`)
	- `GET /artisans/stats` : récupérer les statistiques de l'artisan (`chiffreAffaires`, `commandesEnCours`, `noteGlobale`)


## Middleware JWT

Le middleware `protect` dans `src/middlewares/authMiddleware.ts` :

- vérifie l'en-tête `Authorization: Bearer <token>`
- valide le JWT
- injecte `req.user` avec `id` et `role`
- renvoie `401` si le token est absent ou invalide

## Notes importantes

- Le secret JWT est actuellement codé en dur (`CleSuperSecreteDeMonProjet2026`).
- La route artisan est désormais exposée grâce à l'ajout de `app.use('/api/v1/artisans', artisanRoutes);` dans `src/app.ts`.
- Aucune suite de tests automatique n'est encore configurée.

## Suivants

- Ajouter des tests unitaires et d'intégration
- Ajouter un workflow GitHub Actions pour exécuter les tests
- Externaliser le secret JWT dans une variable d'environnement
