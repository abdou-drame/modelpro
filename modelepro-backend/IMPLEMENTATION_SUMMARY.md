# Résumé des modifications

## Ce qui a été implémenté

1. Routes artisan (backend)
   - Création d'un modèle : `POST /api/v1/models`
   - Liste des modèles de l'artisan : `GET /api/v1/models/my-models`
   - Suppression d'un modèle : `DELETE /api/v1/models/:id`
   - Liste des rendez-vous artisan : `GET /api/v1/artisans/appointments`
   - Mise à jour du statut d'un rendez-vous : `PATCH /api/v1/artisans/appointments/:id/status`
   - Liste des commandes reçues : `GET /api/v1/artisans/orders`
   - Détail complet d'une commande : `GET /api/v1/artisans/orders/:id`
   - Mise à jour du statut de fabrication : `PATCH /api/v1/artisans/orders/:id/status`
   - Statistiques du tableau de bord artisan : `GET /api/v1/artisans/stats`

2. Sécurité et middleware
   - Protection globale avec `protect`
   - Restriction de rôle avec `restrictTo('artisan')`
   - Validation que l'artisan connecté est bien propriétaire des ressources sensibles

3. Modèles de données ajoutés
   - `Appointment`
   - `Order`
   - `Review`

4. Tests d'intégration
   - Fichier de tests créé : `src/__tests__/artisan.test.ts`
   - Couverture de chaque étape 6 à 14
   - Cas nominal et cas de sécurité (non connecté, rôle incorrect, accès à une ressource étrangère)

5. Pipeline GitHub Actions
   - Fichier créé : `.github/workflows/nodejs-ci.yml`
   - Workflow exécute `npm install` puis `npm test` sur les branches `main` pour push et pull request

## Ce qui reste à faire

- Lancer localement `npm test` pour vérifier l’exécution réelle des tests
- Pousser les modifications sur GitHub pour activer le workflow CI
