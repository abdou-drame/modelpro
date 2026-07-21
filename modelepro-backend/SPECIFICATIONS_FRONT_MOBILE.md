# Document de Spécifications d'Intégration Frontend & Mobile — ModèlePro

Ce document est destiné aux équipes de développement (Web & Mobile) responsables de l'intégration de la plateforme ModèlePro avec l'API Backend. 

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

### C. Gestion des Réponses & Erreurs HTTP
Toutes les réponses d'erreur retournent un objet standard : `{ "error": "Message explicatif" }`.
*   **`200/201`** : Succès.
*   **`400`** : Requête invalide (paramètres manquants, format inattendu).
*   **`401`** : Non autorisé (absence de token ou token expiré).
*   **`403`** : Accès refusé (tentative d'accès à la route d'un rôle non autorisé, ex: Client sur une route Artisan).
*   **`404`** : Ressource introuvable.
*   **`500`** : Erreur interne du serveur (bug technique backend).

### D. Uploads de Formulaires Lourds
L'API utilise **Multer** pour la gestion des images `multipart/form-data`.
*   **Payload `FormData` requis** pour : Création de modèles (`/models`), Messagerie avec photo (`/messages`, avec champ `photo`), Personnalisations (`customizationPhoto`).
*   Envoyez la data en précisant le Content-Type `multipart/form-data` manuellement ou laissez Axios/Fetch s'en charger selon la plateforme.

---

## 2. Spécifications de l'Application Mobile (Flutter / React Native)

### A. Espace Client

#### Authentification & Profil
*   **Flux :** Écrans d'inscription (`POST /auth/register` avec role `client`) -> Connexion (`POST /auth/login`).
*   **Profil :** Afficher et mettre à jour le profil avec `GET /users/me` et `PUT /users/me`.

#### Catalogue & Recherche
*   **Route de liste :** `GET /models`
*   **Query Params :** Implémenter l'interface de filtrage en ajoutant `?page=1&limit=20&search=keyword&metierId=123&minPrice=5000&maxPrice=15000` à l'URL.
*   **UX Cible :** Scroll infini reprenant la variable `totalPages`, affichage masonry ou liste.

#### Prise de Rendez-vous
*   **Parcours :** Sur le profil public artisan (`GET /artisans/:id`), le client clique sur "Prendre RDV".
*   **Données (Body JSON) :**
    ```json
    {
      "artisanId": 42,
      "date": "2026-10-15",
      "heure": "14:30",
      "type": "prise_mesures", 
      "notes": "Mesures pour un ensemble basin."
    }
    ```
    *Les valeurs de `type` sont : `prise_mesures`, `consultation`, `depot_article`, `essayage`, `retrait`, `domicile`.*
*   **Statuts reçus :** Le frontend gérera les statuts évolutifs (`demande`, `accepte`, `reporte`, etc.). Afficher un bouton "Accepter/Refuser la contre-proposition" si statut = `reporte`.

#### Gestion des Commandes
*   **Passage :** `POST /orders` avec possibilité d'ajouter `customizationText` (instructions) et `customizationPhoto` (modèle inspirant).
*   **Suivi :** Sur la liste de `GET /orders/my-orders`, afficher élégamment la `deliveryDate`, le `paymentStatus` (`unpaid`, `deposit_paid`, `fully_paid`), et l'acompte payé (`depositAmount`).

#### Messagerie, Avis & Réclamations
*   **Chat :** `GET /messages/order/:orderId` pour charger l'historique et `POST /messages` en `multipart/form-data` avec le champ texte `contenu` et le champ fichier `photo`.
*   **Notation :** `POST /reviews` en fin de parcours de commande (`statut = livree`).
*   **Litiges :** Formulaire rattaché à une commande spécifique appelant `POST /claims`.

---

### B. Espace Artisan

#### Tableau de Bord
*   **Vue principale affichant les métriques clés** (`GET /artisans/stats`) : Revenu global généré, commandes vivantes, et note moyenne de réputation.

#### Gestion du Catalogue
*   **Parcours :** Consulter son catalogue (`GET /models/my-models`), et possibiliter d'uploader de nouvelles créations (`POST /models`) avec accès à la caméra / pellicule mobile (`multipart/form-data`).
*   **Suppression :** Boutons d'édition supprimant les références via `DELETE /models/:id`.

#### Gestion des Commandes & Échéances
*   **Déroulement :** Un artisan reçoit une commande entrante via `GET /artisans/orders`.
*   **Validation et Paiement :** L'artisan peut réclamer une avance et noter l'acompte via `PATCH /artisans/orders/:id/payment` avec `paymentStatus: 'deposit_paid'` et `depositAmount: 15000`.
*   **Échéancier :** L'artisan fixe et ajuste la date de rendu (ex: retards fournisseurs) via `PATCH /artisans/orders/:id/delivery-date` en incluant un champ facultatif `deliveryDateReason` pour justifier le délai au client.

#### Gestion de l'Agenda
*   **Parcours RDV :** L'artisan voit ses requêtes entrantes (`GET /artisans/appointments`). 
*   **Proposer une alternative :** En cas d'indisponibilité, utiliser une pop-up "Proposer une autre date" tapant `PATCH /artisans/appointments/:id/reschedule` avec body `{ "proposedDate": "2026-10-16T18:00:00Z" }`.

---

## 3. Spécifications du Back-Office Web (Admin)

Pensé pour un dashboard Web (Vue.js, React SPA, Nuxt...). Privilégiez des DataGrids pour une bonne lisibilité des masses de données.

*   **Validation des Artisans :** Liste `GET /admin/pending-artisans`. Un bouton "Approuver" lance `PATCH /admin/artisans/:id/verify`. Essentiel pour maintenir une qualité de service.
*   **Gestion du Référentiel Métiers :** CRUD complet au sein du module de paramètres pour administrer les sous-domaines via `POST/PUT/DELETE /admin/metiers/:id`.
*   **Modération & Litiges :** Accès global à `GET /admin/claims`. Sur affichage du litige d'une commande, l'admin peut gérer l'état en appelant `PATCH /admin/claims/:id/status` (passant le statut en `en_cours`, `resolu` ou `rejete`).
*   **Dashboard Global :** Page d'accueil appelant `GET /admin/stats` pour visualiser le `chiffreAffairesTotal`, le `totalArtisansActifs` et le volumétrique des utilisateurs/commandes.

---

## 4. Dictionnaire des Endpoints (API Reference)

*Rappel : Tous les endpoints sont préfixés par `/api/v1`.*

### A. Auth & Profil (Commun)
| Méthode | Route | Accès | Paramètres Body / Query (Exemples) | Description |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | `{ nom, prenom, role (client/artisan), email, password... }` | Création de compte |
| `POST` | `/auth/login` | Public | `{ email, password }` | Authentification JWT |
| `GET` | `/users/me` | Authentifié | - | Informations de session profil |
| `PUT` | `/users/me` | Authentifié | `{ nom, telephone... }` | Mise à jour données civiles |

### B. Espace Client
| Méthode | Route | Accès | Paramètres Body / Query (Exemples) | Description |
|---|---|---|---|---|
| `GET` | `/metiers` | Public | - | Liste de tous les métiers |
| `GET` | `/artisans/:id` | Public | - | Profil public d'un artisan |
| `GET` | `/models` | Public | `?search=X&minPrice=1&metierId=3&page=1` | Recherche/Catalogue |
| `POST` | `/appointments` | Client | `{ artisanId, date, heure, type, notes }` | Soumet un RDV |
| `POST` | `/orders` | Client | `{ artisanId, mesures, customText... }` | Soumet une commande |
| `GET` | `/orders/my-orders`| Client | - | Historique d'achats |
| `POST` | `/claims` | Client | `{ orderId, sujet, description }` | Signaler un litige/réclamation |
| `POST` | `/reviews` | Client | `{ artisanId, note, commentaire }` | Noter une prestation |

### C. Espace Artisan
| Méthode | Route | Accès | Paramètres Body / Query (Exemples) | Description |
|---|---|---|---|---|
| `GET` | `/artisans/stats` | Artisan | - | KPis du portail Artisan |
| `POST` | `/models` | Artisan | `multipart/form-data` (`titre`, `photo`) | Ajoute produit au catalogue |
| `GET` | `/models/my-models`| Artisan | - | Obtenir son catalogue |
| `DELETE`| `/models/:id` | Artisan | - | Retire un produit de la vente |
| `GET` | `/artisans/orders` | Artisan | - | Toutes ses commandes reçues |
| `PATCH` | `/artisans/orders/:id/status` | Artisan | `{ statut: 'prete' }` | Changer état fabrication |
| `PATCH` | `/artisans/orders/:id/payment`| Artisan | `{ paymentStatus: 'deposit_paid', depositAmount }` | Récupérer et pointer des fonds |
| `PATCH` | `/artisans/orders/:id/delivery-date` | Artisan | `{ deliveryDate, deliveryDateReason }` | Reporter ou borner échéance |
| `GET` | `/artisans/appointments` | Artisan | - | Les requêtes de visite |
| `PATCH` | `/artisans/appointments/:id/reschedule` | Artisan | `{ proposedDate }` | Reporte en proposant une date |
| `PATCH` | `/artisans/appointments/:id/status` | Artisan | `{ statut: 'accepte' }` | Accepter/Terminer un RDV |

### D. Espace Admin
| Méthode | Route | Accès | Paramètres Body / Query (Exemples) | Description |
|---|---|---|---|---|
| `GET` | `/admin/stats` | Admin | - | Dashbord financier / volumétrique |
| `GET` | `/admin/pending-artisans` | Admin | - | Liste artisans à revoir |
| `PATCH` | `/admin/artisans/:id/verify` | Admin | - | Confère statut `valide` |
| `POST` | `/admin/metiers` | Admin | `{ nom, description }` | Ajoute un métier au système |
| `PUT` | `/admin/metiers/:id` | Admin | `{ nom... }` | Modifier métier existant |
| `DELETE`| `/admin/metiers/:id` | Admin | - | Supprimer dictionnaire métier |
| `GET` | `/admin/claims` | Admin | - | Litiges entrants |
| `PATCH` | `/admin/claims/:id/status`| Admin | `{ statut: 'en_cours' }` | Traiter la médiation litige |

### E. Transverses (Messages & Notifications)
| Méthode | Route | Accès | Paramètres Body / Query (Exemples) | Description |
|---|---|---|---|---|
| `POST` | `/messages` | Tous | `multipart/form-data` (`orderId`, `contenu`, `photo`) | Chat contextuel lié à commande |
| `GET` | `/messages/order/:id` | Tous | - | Historique d'une bulle de chat |
| `GET` | `/notifications` | Tous | - | Mes alertes push In-app |
| `PATCH` | `/notifications/:id/read` | Tous | - | Acquitter l'alerte |
