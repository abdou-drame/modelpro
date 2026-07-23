# Document de Spécifications d'Intégration Frontend & Mobile — ModèlePro

Ce document est destiné aux équipes de développement (Web & Mobile) responsables de l'intégration de la plateforme ModèlePro avec l'API Backend V1.

---

## 1. Vue d'Ensemble & Configuration API

### A. Base URL & Environnements
Toutes les requêtes de l'application doivent cibler la racine de l'API avec le préfixe `/api/v1`.
*   **Développement local :** `http://localhost:5000/api/v1`
*   **Staging / Pré-production :** `https://staging-api.modelepro.com/api/v1` (exemple)
*   **Production :** `https://api.modelepro.com/api/v1` (exemple)

### B. Authentification & Sécurité
*   **Standard :** JSON Web Tokens (JWT).
*   **Format d'en-tête :** Les requêtes privées nécessitent le header : `Authorization: Bearer <votre_token>`.
*   **Stockage côté client :** 
    *   **Mobile :** Stockage sécurisé (`SecureStore` sur Expo/React Native ou `FlutterSecureStorage`).
    *   **Web :** `HttpOnly cookies` ou `localStorage` (avec stratégie de rafraîchissement adéquate si pertinent).
*   **Expiration :** Gérer l'expiration silencieusement (renvoie au login en cas de code 401 sur requête API).

### C. Notifications Push (FCM)
*   **Enregistrement du token FCM :** Chaque fois qu'un utilisateur se connecte ou met à jour ses jetons Push, l'application mobile doit envoyer le jeton via `PATCH /users/fcm-token` :
    ```json
    { "fcmToken": "votre_token_fcm_mobile" }
    ```

### D. Gestion des Réponses & Erreurs HTTP
Toutes les réponses d'erreur retournent un objet standard : `{ "error": "Message explicatif" }`.
*   **`200/201`** : Succès.
*   **`400`** : Requête invalide (paramètres manquants, note hors intervalle 1-5, format inattendu).
*   **`401`** : Non autorisé (absence de token ou token expiré).
*   **`403`** : Accès refusé (tentative d'accès à la route d'un rôle non autorisé, ex: Client sur une route Artisan).
*   **`404`** : Ressource introuvable.
*   **`500`** : Erreur interne du serveur.

### E. Uploads & Fichiers Statiques
*   **Multer** gère les uploads multipart/form-data pour les images (`image/*`).
*   Les fichiers téléversés sont servis statiquement par le serveur backend sous l'URL `/uploads/<nom_fichier>`.

---

## 2. Spécifications de l'Application Mobile (Flutter / React Native)

### A. Espace Client

#### Authentification & Profil
*   **Flux :** Inscription (`POST /auth/register` avec role `client`) -> Connexion (`POST /auth/login`).
*   **Profil :** Afficher et mettre à jour le profil avec `GET /users/me` et `PUT /users/me` (nom, prenom, telephone, email, photoUrl, localisation).
*   **Token Push :** Envoyer le token FCM via `PATCH /users/fcm-token`.

#### Catalogue & Recherche
*   **Route de liste :** `GET /models`
*   **Query Params :** `?page=1&limit=20&search=mot_cle&metierId=couture&minPrice=5000&maxPrice=50000&artisanId=12`
*   **Détail Modèle :** `GET /models/:id` (inclut l'artisan, les options, delaiEstime, photoUrl, photos, categorie).

#### Prise & Suivi de Rendez-vous
*   **Soumettre un RDV :** `POST /appointments` avec body JSON :
    ```json
    {
      "artisanId": 42,
      "date": "2026-10-15",
      "heure": "14:30",
      "type": "prise_mesures", 
      "notes": "Mesures pour un ensemble bazin."
    }
    ```
*   **Mes RDV :** `GET /appointments/my-appointments`.
*   **Annuler un RDV :** `PATCH /appointments/:id/cancel`.

#### Gestion des Commandes
*   **Passer une commande :** `POST /orders`
    ```json
    {
      "artisanId": 42,
      "modeleId": 10,
      "prix": 35000,
      "couleur": "Bleu Roi",
      "taille": "XL",
      "matiere": "Bazin Rich",
      "consignes": "Broderie dorée au col",
      "mesures": "Épaules: 45cm, Poitrine: 100cm"
    }
    ```
*   **Mes commandes :** `GET /orders/my-orders`
*   **Annuler une commande :** `PATCH /orders/:id/cancel` avec `{ "motifAnnulation": "Raison" }`.

#### Messagerie, Notifications & Paiements
*   **Conversations :** Liste des conversations via `GET /messages/conversations`.
*   **Discussion d'une commande :** Historique `GET /messages/order/:orderId`, Envoi `POST /messages` (`orderId`, `texte`, `photo`).
*   **Marquer un message comme lu :** `PATCH /messages/:id/read`.
*   **Notifications :** Liste `GET /notifications`, Marquer lue `PATCH /notifications/:id/read`, Tout lire `PATCH /notifications/read-all`.
*   **Paiements :** Enregistrer un paiement `POST /payments` (`orderId`, `montant`, `type`: 'acompte'|'solde', `moyen`: 'wave'|'om'|'carte'), lister les paiements d'une commande `GET /payments/order/:orderId`.

#### Avis & Réclamations
*   **Déposer un avis (5 sous-notes) :** Stricte condition : commande au statut `livree`.
    `POST /reviews` :
    ```json
    {
      "artisanId": 42,
      "noteQualite": 5,
      "noteDelai": 4,
      "noteCommunication": 5,
      "notePrix": 4,
      "noteProfessionnalisme": 5,
      "commentaire": "Superbe travail !"
    }
    ```
*   **Avis d'un artisan :** `GET /artisans/:artisanId/reviews`.
*   **Soumettre une réclamation :** `POST /claims` (`orderId`, `sujet`, `description`, `photoPreuve`).
*   **Mes réclamations :** `GET /claims/my-claims`.

---

### B. Espace Artisan

#### Tableau de Bord & Profil
*   **Statistiques :** `GET /artisans/stats` (revenus, commandes en cours, note moyenne, nombre d'avis).
*   **Mon Profil Artisan :** `GET /artisans/me` et `PUT /artisans/me` (atelier, description, experience, horaires, zone, photosAtelier, documentValidation).

#### Gestion du Catalogue
*   **Mes modèles :** `GET /models/my-models`.
*   **Ajouter un modèle :** `POST /models` (`titre`, `description`, `photoUrl`, `prixEstimatif`, `delaiEstime`, `options`, `categorie`, `photos`).
*   **Modifier un modèle :** `PUT /models/:id`.
*   **Supprimer un modèle :** `DELETE /models/:id`.

#### Commandes & Agenda
*   **Commandes reçues :** `GET /artisans/orders` et détail `GET /artisans/orders/:id`.
*   **Changer le statut :** `PATCH /artisans/orders/:id/status` (`statut`: 'acceptee' | 'en_cours' | 'en_finition' | 'prete' | 'livree' | 'annulee').
*   **Mettre à jour le paiement :** `PATCH /artisans/orders/:id/payment` (`paymentStatus`, `depositAmount`).
*   **Date de livraison :** `PATCH /artisans/orders/:id/delivery-date` (`deliveryDate`, `deliveryDateReason`).
*   **Rendez-vous reçus :** `GET /artisans/appointments`.
*   **Statut RDV :** `PATCH /artisans/appointments/:id/status` (`statut`: 'accepte' | 'refuse', `motifRefus`).
*   **Reporter RDV :** `PATCH /artisans/appointments/:id/reschedule` (`proposedDate`).

---

## 3. Spécifications du Back-Office Web (Admin)

*   **Gestion des Utilisateurs :**
    *   Liste globale : `GET /admin/users`
    *   Activer / Suspendre : `PATCH /admin/users/:id/status` (`statut`: 'actif' | 'suspendu')
*   **Modération des Artisans :**
    *   Artisans en attente : `GET /admin/pending-artisans`
    *   Valider un artisan : `PATCH /admin/artisans/:id/verify`
    *   Rejeter un artisan : `PATCH /admin/artisans/:id/reject` (`motifRejet`)
*   **Commandes & Litiges :**
    *   Liste de toutes les commandes : `GET /admin/orders`
    *   Liste des réclamations : `GET /admin/claims`
    *   Traiter une réclamation : `PATCH /admin/claims/:id/status` (`statut`: 'en_cours' | 'resolu' | 'rejete')
*   **Référentiel Métiers :**
    *   Créer (`POST /admin/metiers`), Modifier (`PUT /admin/metiers/:id`), Supprimer (`DELETE /admin/metiers/:id`)
*   **Statistiques Globales :**
    *   `GET /admin/stats` (renvoie `totalUsers`, `totalArtisansActifs`, `totalClients`, `totalCommandes`, `totalClaims`, `chiffreAffairesTotal`).

---

## 4. Dictionnaire des Endpoints (API Reference)

*Préfixe de toutes les routes : `/api/v1`*

### A. Auth & Utilisateurs
| Méthode | Route | Accès | Body / Query | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | `{ nom, prenom, telephone, email, password, role }` | Inscription client/artisan |
| `POST` | `/auth/login` | Public | `{ telephone/email, password }` | Connexion JWT |
| `GET` | `/users/me` | Connecté | - | Profil utilisateur connecté |
| `PUT` | `/users/me` | Connecté | `{ nom, prenom, telephone, photoUrl, localisation }` | Mise à jour profil |
| `PATCH` | `/users/fcm-token` | Connecté | `{ fcmToken }` | Enregistrement du token FCM Push |

### B. Métiers & Artisans
| Méthode | Route | Accès | Body / Query | Description |
|---|---|---|---|---|
| `GET` | `/metiers` | Public | - | Liste de tous les métiers |
| `GET` | `/artisans` | Public | `?search=X&metier=Y&zone=Z` | Rechercher des artisans validés |
| `GET` | `/artisans/:id` | Public | - | Profil public artisan avec note & nombre avis |
| `GET` | `/artisans/:id/reviews` | Public | - | Liste des avis reçus par l'artisan |
| `GET` | `/artisans/me` | Artisan | - | Profil propre de l'artisan connecté |
| `PUT` | `/artisans/me` | Artisan | `{ atelier, description, experience... }` | Mise à jour profil artisan |
| `GET` | `/artisans/stats` | Artisan | - | Statistiques portail artisan |

### C. Catalogue & Modèles
| Méthode | Route | Accès | Body / Query | Description |
|---|---|---|---|---|
| `GET` | `/models` | Public | `?search=X&minPrice=A&maxPrice=B&page=1` | Recherche & catalogue modèles |
| `GET` | `/models/:id` | Public | - | Détail d'un modèle |
| `GET` | `/models/my-models` | Artisan | - | Liste des modèles de l'artisan connecté |
| `POST` | `/models` | Artisan | `{ titre, description, photoUrl, prixEstimatif, delaiEstime, options, categorie, photos }` | Ajouter une création au catalogue |
| `PUT` | `/models/:id` | Artisan | `{ titre, description, prixEstimatif... }` | Modifier un modèle existant |
| `DELETE` | `/models/:id` | Artisan | - | Supprimer un modèle du catalogue |

### D. Rendez-vous
| Méthode | Route | Accès | Body / Query | Description |
|---|---|---|---|---|
| `POST` | `/appointments` | Client | `{ artisanId, date, heure, notes }` | Prise de RDV |
| `GET` | `/appointments/my-appointments` | Client | - | Mes RDV client |
| `PATCH` | `/appointments/:id/cancel` | Client | - | Annuler un RDV |
| `GET` | `/artisans/appointments` | Artisan | - | Liste des RDV reçus par l'artisan |
| `PATCH` | `/artisans/appointments/:id/status` | Artisan | `{ statut: 'accepte'\|'refuse', motifRefus }` | Valider ou refuser un RDV |
| `PATCH` | `/artisans/appointments/:id/reschedule` | Artisan | `{ proposedDate }` | Reporter un RDV |

### E. Commandes & Paiements
| Méthode | Route | Accès | Body / Query | Description |
|---|---|---|---|---|
| `POST` | `/orders` | Client | `{ artisanId, modeleId, prix, couleur, taille, matiere, consignes, mesures }` | Passer une commande |
| `GET` | `/orders/my-orders` | Client | - | Liste des commandes client |
| `PATCH` | `/orders/:id/cancel` | Client | `{ motifAnnulation }` | Annuler une commande avec motif |
| `GET` | `/artisans/orders` | Artisan | - | Commandes reçues par l'artisan |
| `GET` | `/artisans/orders/:id` | Artisan | - | Détail d'une commande |
| `PATCH` | `/artisans/orders/:id/status` | Artisan | `{ statut }` | Mettre à jour le statut de fabrication |
| `PATCH` | `/artisans/orders/:id/payment` | Artisan | `{ paymentStatus, depositAmount }` | Mettre à jour les paramètres de paiement |
| `PATCH` | `/artisans/orders/:id/delivery-date` | Artisan | `{ deliveryDate, deliveryDateReason }` | Fixer/ajuster la date de livraison |
| `POST` | `/payments` | Client | `{ orderId, montant, type, moyen }` | Enregistrer une transaction de paiement |
| `GET` | `/payments/order/:orderId` | Connecté | - | Liste des paiements d'une commande |

### F. Avis, Réclamations & Transverses
| Méthode | Route | Accès | Body / Query | Description |
|---|---|---|---|---|
| `POST` | `/reviews` | Client | `{ artisanId, noteQualite, noteDelai, noteCommunication, notePrix, noteProfessionnalisme, commentaire }` | Déposer un avis 5 sous-notes |
| `POST` | `/claims` | Client | `{ orderId, sujet, description, photoPreuve }` | Soumettre un litige |
| `GET` | `/claims/my-claims` | Client | - | Historique de mes réclamations |
| `POST` | `/messages` | Connecté | `multipart/form-data` (`orderId`, `texte`, `photo`) | Envoyer un message |
| `GET` | `/messages/order/:orderId` | Connecté | - | Messages d'une commande |
| `GET` | `/messages/conversations` | Connecté | - | Liste de mes conversations |
| `PATCH` | `/messages/:id/read` | Connecté | - | Marquer un message comme lu |
| `GET` | `/notifications` | Connecté | - | Mes notifications |
| `PATCH` | `/notifications/:id/read` | Connecté | - | Marquer une notification comme lue |
| `PATCH` | `/notifications/read-all` | Connecté | - | Marquer toutes les notifications comme lues |

### G. Back-Office Admin
| Méthode | Route | Accès | Body / Query | Description |
|---|---|---|---|---|
| `GET` | `/admin/users` | Admin | - | Liste de tous les utilisateurs |
| `PATCH` | `/admin/users/:id/status` | Admin | `{ statut: 'actif'\|'suspendu' }` | Activer ou suspendre un utilisateur |
| `GET` | `/admin/pending-artisans` | Admin | - | Liste des artisans en attente |
| `PATCH` | `/admin/artisans/:id/verify` | Admin | - | Approuver un profil artisan |
| `PATCH` | `/admin/artisans/:id/reject` | Admin | `{ motifRejet }` | Rejeter un profil artisan avec motif |
| `GET` | `/admin/orders` | Admin | - | Liste de toutes les commandes |
| `GET` | `/admin/claims` | Admin | - | Liste de tous les litiges |
| `PATCH` | `/admin/claims/:id/status` | Admin | `{ statut: 'en_cours'\|'resolu'\|'rejete' }` | Traiter une réclamation |
| `POST` | `/admin/metiers` | Admin | `{ nom, description }` | Ajouter un métier |
| `PUT` | `/admin/metiers/:id` | Admin | `{ nom, description }` | Modifier un métier |
| `DELETE` | `/admin/metiers/:id` | Admin | - | Supprimer un métier |
| `GET` | `/admin/stats` | Admin | - | Statistiques globales de la plateforme |
