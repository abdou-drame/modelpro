# 📖 Documentation de Fonctionnement Global — ModèlePro Backend

Ce document détaille l'architecture, le système d'authentification par rôles, les flux fonctionnels de l'application, ainsi que le fonctionnement complet des **Paiements**, de la **Messagerie** et des **Notifications**.

---

## 1. 🔑 Authentification & Gestion des Rôles

L'application repose sur un système d'authentification basé sur des **jetons JWT (JSON Web Token)** et sécurisé par le hachage des mots de passe (`bcrypt`). L'identifiant principal de connexion est le **numéro de téléphone** (`telephone`).

La plateforme gère trois rôles distincts : **Client**, **Artisan** et **Administrateur (Admin)**.

### A. Inscription (`POST /api/v1/auth/register`)
L'inscription requiert les informations de base (`nom`, `prenom`, `telephone`, `email`, `password`, `role`).

* **Client (`role: "client"`) :**
  * Nécessite le champ obligatoire : `localisation`.
  * Le compte est **immédiatement actif**.
  * La réponse retourne directement le token JWT permettant la connexion automatique de l'utilisateur.

* **Artisan (`role: "artisan"`) :**
  * Nécessite les champs obligatoires : `métier`, `atelier`, `localisation` (et optionnellement `description`, `horaires`, `zone`).
  * Le profil artisan est créé avec le statut : `statutValidation = 'en_attente'`.
  * Le compte **ne peut pas se connecter immédiatement** (l'accès est bloqué jusqu'à validation par un administrateur).

### B. Connexion (`POST /api/v1/auth/login`)
Requiert : `telephone` et `password`.

**Contrôles effectués lors de la connexion :**
1. Vérification de l'existence de l'utilisateur.
2. Vérification du mot de passe.
3. **Statut utilisateur :** Si l'utilisateur a le statut `'suspendu'`, la connexion est rejetée (`403 Forbidden`).
4. **Validation Artisan :** Si l'utilisateur est un artisan, le serveur vérifie `statutValidation === 'valide'`. Si la validation est toujours en attente ou rejetée, la connexion est bloquée (`403 Forbidden`).
5. En cas de succès, le serveur renvoie un **Token JWT** qui doit être fourni par le client/mobile dans l'en-tête HTTP : `Authorization: Bearer <votre_token>`.

### C. Administrateur (Admin)
* **Création du compte :** Les comptes administrateurs sont créés directement en base de données ou via un script de seed (il n'y a pas d'inscription publique pour le rôle Admin pour des raisons de sécurité).
* **Connexion (`POST /api/v1/auth/login`) :**
  * L'administrateur se connecte via la même route de connexion avec son `telephone` et son `password`.
  * Le serveur génère un jeton JWT contenant le rôle `role: 'admin'`.
* **Accès et Autorisations :**
  * Le tableau de bord Admin (Front-end / Web) envoie le token JWT dans l'en-tête `Authorization: Bearer <token_admin>`.
  * Le middleware `restrictTo('admin')` protège toutes les routes `/api/v1/admin/*` et refuse l'accès aux clients et artisans (`403 Forbidden`).
* **Fonctionnalités Back-Office Admin (Module 12) :**
  * **Tableau de bord & Statistiques (`GET /api/v1/admin/stats`) :** Indicateurs synthétiques (utilisateurs, artisans, commandes, RDV, réclamations, CA, commandes en retard, abonnements) + statistiques avancées (métiers les plus demandés, artisans les mieux notés).
  * **Gestion Clients & Utilisateurs (`GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/status`) :** Rechercher par nom/tél/email, filtrer et suspendre/activer les comptes.
  * **Gestion Artisans (`GET /api/v1/admin/artisans`, `GET /api/v1/admin/pending-artisans`, `PATCH /api/v1/admin/artisans/:id/verify`, `PATCH /api/v1/admin/artisans/:id/reject`) :** Valider les dossiers, rejeter avec motif (et notification) et contrôler les profils.
  * **Gestion Métiers (`POST/PUT/DELETE /api/v1/admin/metiers`, `PATCH /api/v1/admin/metiers/:id/toggle`) :** Créer, modifier, désactiver/activer et supprimer des catégories métiers.
  * **Gestion Modèles (`GET /api/v1/admin/models`, `DELETE /api/v1/admin/models/:id`) :** Modérer les photos et contenus du catalogue.
  * **Gestion Commandes (`GET /api/v1/admin/orders`, `GET /api/v1/admin/orders/overdue`) :** Suivi global des statuts de fabrication et identification des commandes en retard (`estEnRetard`).
  * **Gestion Rendez-vous (`GET /api/v1/admin/appointments`) :** Centralisation de toutes les demandes de rendez-vous et des annulations.
  * **Gestion Réclamations (`GET /api/v1/admin/claims`, `PATCH /api/v1/admin/claims/:id/status`) :** Qualification, traitement et clôture des litiges.
  * **Gestion Paiements (`GET /api/v1/admin/payments`) :** Suivi global des abonnements artisans, des frais de service et des commissions.

---

## 2. 🚀 Fonctionnalités & Déroulement des Flux (Workflows)

```
[ Client ] ──> Prise de RDV / Commande ──> [ Artisan ]
    │                                          │
    ├─── Paiement Acompte / Solde (Wave/OM) ───┤
    ├─── Chat & Envoi d'images de modèles ─────┤
    └─── Notifications In-App & Push (FCM) ────┘
```

### Flux 1 : Prise & Suivi de Rendez-vous (RDV)
1. **Demande :** Le client sélectionne un artisan et soumet un RDV (`POST /api/v1/appointments`) en précisant la date, l'heure, le type (`prise_mesures`, `essayage`, `consultation`) et des notes.
2. **Notification :** L'artisan reçoit automatiquement une notification In-App `'demande_rdv'`.
3. **Validation :** L'artisan consulte ses RDV (`GET /api/v1/appointments/artisan-appointments`) et accepte ou refuse (`PATCH /api/v1/appointments/:id/status`).
4. **Mise à jour :** Le client reçoit une notification `'rdv_statut'` avec la réponse de l'artisan.

### Flux 2 : Gestion de Commande & Fabrication
1. **Passage de commande :** Le client passe commande (`POST /api/v1/orders`) avec les spécifications (modèle, prix, couleur, taille, matière, consignes, mesures).
2. **Cycle de vie de la commande :**
   `en_attente` ➔ `validee` ➔ `en_cours` ➔ `terminee` ➔ `livree` (ou `annulee`).
3. **Suivi :** L'artisan met à jour l'avancement via `PATCH /api/v1/orders/:id/status`.
4. **Avis & Évaluation :** Une fois la commande au statut `livree`, le client peut laisser un avis détaillé avec des notes sur 5 critères (qualité, délai, accueil, etc.) via `POST /api/v1/reviews`.

---

## 3. 💳 Système de Paiement — Fonctionnement V1 & Évolution

Le système de paiement est conçu pour s'adapter au modèle économique des artisans sur-mesure (acompte au démarrage de la confection, puis solde à la livraison).

---

### A. Fonctionnement Actuel en Version 1 (V1 - Module 7.10)
En **V1**, le système assure la **traçabilité financière semi-intégrée complète**, la gestion des abonnements d'artisans, la collecte des frais de service et la mise à jour automatisée des états de commande.

1. **Modalités & Types de Paiement (`type`) :**
   * `acompte` : Avance initiale versée à la commande pour engager l'artisan et acheter les fournitures.
   * `solde` : Règlement du montant restant dû à la livraison ou réception de la création.
   * `integral` : Règlement en une seule fois de la totalité du montant.
   * `frais_service` : Frais de service de la plateforme prélevés lors de la commande ou du traitement.
   * `abonnement` : Redevance ou souscription d'abonnement artisan pour bénéficier des services de la plateforme.

2. **Moyens de Paiement Gérés (`moyen`) :**
   * `wave` (Wave Mobile Money)
   * `orange_money` (Orange Money)
   * `free_money` (Free Money)
   * `especes` (Règlement comptant en main propre / espèces)

3. **Prise en charge des références de transaction (`referenceTransaction`) :**
   * Possibilité d'associer un code de transaction ou numéro de reçu externe (ex : `WAVE-TX-12345`, `OM-987654`) pour faciliter les réconciliations comptables.

4. **Déroulement d'une Transaction V1 (`POST /api/v1/payments`) :**
   * **Étape 1 — Déclaration :** L'application soumet la transaction avec `orderId` (ou `artisanId` pour un abonnement), `montant`, `type`, `moyen` et `referenceTransaction` optionnelle.
   * **Étape 2 — Registre PostgreSQL/Sequelize :** Une transaction est enregistrée dans la table `payments` avec son statut (`'confirme'`, `'en_attente'`, `'echoue'`, `'rembourse'`).
   * **Étape 3 — Effets de Bord Automatiques :**
     * **Commande (`acompte`)** ➔ La commande passe au statut `paymentStatus = 'deposit_paid'`.
     * **Commande (`solde` ou `integral`)** ➔ La commande passe au statut `paymentStatus = 'fully_paid'`.
     * **Abonnement Artisan (`abonnement`)** ➔ L'artisan passe automatiquement en `statutAbonnement = 'actif'` et sa date de fin d'abonnement (`dateFinAbonnement`) est prolongée de 30 jours.
   * **Étape 4 — Notifications Automatiques :**
     * Notifications In-App transmises au client et à l'artisan pour confirmer le règlement ou le renouvellement d'abonnement.

5. **API de Consultation & Résumé Financier :**
   * **Historique des versements d'une commande :** `GET /api/v1/payments/order/:orderId`
   * **Résumé financier décomposé (`GET /api/v1/payments/summary/:orderId`) :** Renvoie la synthèse détaillée : `totalPrice`, `depositAmount`, `totalAcomptePaid`, `totalSoldePaid`, `totalFraisServicePaid`, `totalOrderPaid`, `remainingBalance` (reste à payer) et `paymentStatus`.
   * **Abonnements de l'artisan (`GET /api/v1/payments/subscriptions/my`) :** Renvoie le statut actif/expiré et l'historique des cotisations.
   * **Mise à jour du statut (`PATCH /api/v1/payments/:id/status`) :** Permet à l'admin ou à l'artisan de confirmer ou annuler un paiement semi-intégré.

---

### B. Étapes pour Passer au Paiement Automatique Intégré (Feuille de Route V2 / Passerelle)

Pour transformer ce système déclaratif V1 en un **prélèvement bancaire direct et automatique** (sans saisie manuelle), voici les 5 étapes d'intégration à suivre :

```
[ Application Mobile/Web ]
        │ 1. Demande de paiement
        ▼
[ Backend ModèlePro ] ── 2. Génère Session ──► [ Passerelle (Wave / PayDunya) ]
        ▲                                                │ 3. Client confirme
        │                                                ▼
        └──────────── 4. Webhook automatique ────────────┘
```

#### Étape 1 : Création du Compte Marchand
* Obtenir un compte professionnel auprès d'un agrégateur de paiement ou opérateur local :
  * **PayDunya** (Recommandé pour l'Afrique de l'Ouest : Wave, OM, Free Money, Carte en une seule API).
  * **Wave Business API** (Prélèvement direct Wave).
  * **Orange Money Web Payment API**.

#### Étape 2 : Configuration des Clés API dans le Backend
* Ajouter les clés secrètes fournies par la passerelle dans le fichier `.env` du backend :
  ```env
  PAYMENT_GATEWAY_API_KEY=pk_live_xxxxxxxxx
  PAYMENT_GATEWAY_SECRET_KEY=sk_live_xxxxxxxxx
  PAYMENT_WEBHOOK_SECRET=whsec_xxxxxxxxx
  ```

#### Étape 3 : Ajout de la Route d'Initialisation (`POST /api/v1/payments/initiate`)
* Le backend génère un lien ou jeton de paiement sécurisé transmis à la passerelle :
  ```typescript
  // Exemple d'initialisation de paiement
  const paymentSession = await paymentGateway.createCheckoutSession({
    amount: montant,
    currency: 'XOF',
    orderId: order.id,
    returnUrl: 'modelepro://payment-success',
    cancelUrl: 'modelepro://payment-cancel',
  });
  // Renvoie l'URL de redirection Wave / Orange Money à l'app mobile
  return res.json({ checkoutUrl: paymentSession.url });
  ```

#### Étape 4 : Redirection Directe sur Mobile
* L'application mobile ouvre directement l'application **Wave** ou **Orange Money** avec le montant exact déjà pré-rempli.

#### Étape 5 : Traitement Automatique via Webhook (`POST /api/v1/payments/webhook`)
* Lorsque le client valide le paiement sur son téléphone, la passerelle envoie une alerte sécurisée (Webhook) au backend ModèlePro.
* Le backend vérifie la signature cryptographique du Webhook et met automatiquement à jour le statut de la commande et envoie les notifications sans aucune intervention humaine.

---

---

## 4. 💬 Messagerie (Chat en direct)

La messagerie permet un échange direct et sécurisé entre le client et l'artisan **dans le cadre d'une commande**.

### A. Fonctionnement
* **Attachement à la commande :** Chaque fil de discussion est lié à un `orderId`. Seuls le client ayant passé la commande et l'artisan concerné peuvent participer à la discussion (contrôle strict des accès).
* **Contenu des messages :**
  * Texte brut.
  * Fichiers/Photos (téléversement géré via Multer et stocké sous `/uploads/`).
* **Statut de lecture :** Chaque message possède un booléen `lu` permettant d'indiquer si le destinataire a lu le message.

### B. Endpoints de la Messagerie
* `POST /api/v1/messages` : Envoyer un message (texte et/ou photo). Génère automatiquement une notification In-App pour le destinataire.
* `GET /api/v1/messages/order/:orderId` : Obtenir l'historique complet des messages d'une commande.
* `GET /api/v1/messages/conversations` : Obtenir la liste de toutes les conversations actives de l'utilisateur avec le dernier message envoyé.
* `PATCH /api/v1/messages/:id/read` : Marquer un message comme lu.

---

## 5. 🔔 Notifications (In-App & Push Mobile)

Le système de notifications est hybride pour garantir que l'utilisateur ne manque aucune information.

### A. Notifications In-App (Centre de Notifications)
* **Stockage :** Enregistrées dans la table `notifications` en base de données avec un titre, une description, un type et un `referenceId` (ex: ID de la commande ou du RDV).
* **Déclenchement automatique :** Générées silencieusement par le backend lors des actions suivantes :
  * Réception d'un message (`nouveau_message`)
  * Création / Modification d'un RDV (`demande_rdv`, `rdv_statut`)
  * Changement d'état d'une commande (`commande_statut`)
  * Réception d'un paiement (`paiement`)
  * Invitation à laisser un avis (`notation`)
* **Endpoints dédiés :**
  * `GET /api/v1/notifications` : Liste toutes les notifications de l'utilisateur connecté.
  * `PATCH /api/v1/notifications/:id/read` : Marquer une notification comme lue.
  * `PATCH /api/v1/notifications/read-all` : Tout marquer comme lu.

### B. Notifications Push Mobile (FCM)
* Le champ `fcmToken` est présent dans le modèle utilisateur.
* L'application mobile enregistre son jeton d'appareil via `PATCH /api/v1/users/fcm-token`.
* Permet l'envoi de Push sur l'écran de verrouillage du smartphone via Firebase Cloud Messaging lorsque l'application est fermée.

---

## 📋 Résumé des Endpoints Majeurs

| Module | Méthode | Route | Description |
| :--- | :---: | :--- | :--- |
| **Auth** | `POST` | `/api/v1/auth/register` | Inscription Client ou Artisan |
| **Auth** | `POST` | `/api/v1/auth/login` | Connexion (tous rôles) |
| **User** | `PATCH` | `/api/v1/users/fcm-token` | Mise à jour du token Push FCM |
| **Admin** | `GET` | `/api/v1/admin/pending-artisans` | Liste des artisans à valider |
| **Admin** | `PATCH` | `/api/v1/admin/artisans/:id/validate` | Valider / Rejeter un artisan |
| **RDV** | `POST` | `/api/v1/appointments` | Soumettre une demande de RDV |
| **Commandes** | `POST` | `/api/v1/orders` | Créer une commande |
| **Paiements** | `POST` | `/api/v1/payments` | Enregistrer un paiement (Wave, OM, Carte) |
| **Messages** | `POST` | `/api/v1/messages` | Envoyer un message (texte/photo) |
| **Messages** | `GET` | `/api/v1/messages/conversations` | Liste des conversations chargées |
| **Notifications**| `GET` | `/api/v1/notifications` | Centre de notifications de l'utilisateur |
