# API Naatalix — Référence des endpoints

Documentation du module **Naatalix** (CRM/ERP multi-tenant pour entreprises) construit sur le même
backend que ModèlePro (marketplace artisans — voir `README.md` pour ses endpoints). Toutes les
routes ci-dessous sont préfixées par `BASE : /api/v1`.

> Pour ModèlePro (marketplace client/artisan), voir la section « Endpoints API » du `README.md`.
> Pour l'audit de sécurité/production et le détail de chaque décision de conception, voir
> `../JOURNAL.md` (journal chronologique complet du développement de Naatalix).

---

## 1. Concepts transverses

### Authentification

Toutes les routes protégées attendent un header `Authorization: Bearer <token>`. Le token est un
JWT signé (`JWT_SECRET`), valable 7 jours, invalidable côté serveur via `sessionVersion` (voir
`POST /auth/logout`).

### Multi-tenant (entreprise)

Un compte Naatalix a `role: 'entreprise'`, un `companyId` et un `companyRole` parmi :
`admin`, `manager`, `commercial`, `finance`, `stock`, `readonly`. Toute donnée est strictement
filtrée par `companyId` — aucune requête ne peut voir les données d'une autre entreprise.

### Formules d'abonnement

3 formules (Essentiel/Pro/Business) contrôlent l'accès à certaines fonctionnalités via un système
de clés (`PLAN_FEATURE_KEYS`, voir `src/services/subscriptionService.ts`). Un endpoint gaté renvoie
`403 { code: 'FEATURE_NOT_IN_PLAN', error: '...' }` si la formule ne l'inclut pas. Un abonnement
suspendu/expiré renvoie `403 { code: 'SUBSCRIPTION_INACTIVE', ... }` sur les routes d'écriture
(`enforceSubscription`) — la lecture reste possible en lecture seule.

### Format des réponses

- **Listes paginées** : `{ data: [...], total, page, totalPages }` (query `?page=&limit=`).
- **Erreurs** : toujours `{ error: "message en français" }`, parfois avec un `code` machine-lisible
  (`QUOTA_EXCEEDED`, `FEATURE_NOT_IN_PLAN`, `SUBSCRIPTION_INACTIVE`, `DEXPAY_NOT_CONFIGURED`...).
- **Montants** : nombres bruts en FCFA (pas de sous-unité, pas de formatage).
- **Documents commerciaux** (devis/commande/facture/bon de commande fournisseur) : `sousTotal`,
  `remiseGlobale`, `totalTaxes`, `totalTTC`, et pour les factures/BC fournisseur en plus
  `montantPaye`/`soldeRestant`.

---

## 2. Authentification & compte

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `POST` | `/companies/register` | Public | Crée l'entreprise + son premier utilisateur (`admin`) en une transaction |
| `POST` | `/auth/login` | Public | Connexion (téléphone/email + mot de passe) |
| `POST` | `/auth/2fa/verify` | Public (tempToken) | 2ᵉ étape de connexion si la 2FA est active |
| `POST` | `/auth/logout` | Connecté | Invalide tous les jetons existants (`sessionVersion++`) |
| `GET` | `/companies/me` | Connecté | Fiche de l'entreprise courante |
| `PUT` | `/companies/me` | Admin | Modifier l'entreprise (identité, mentions PDF, `objectifCaMensuelFcfa` pour le score de santé financière, etc.) |
| `POST` | `/companies/me/logo` | Admin | Upload logo (`multipart/form-data`, champ `logo`, ≤5 Mo, PNG/JPEG/WEBP) |
| `GET` | `/companies/members` | Connecté | Liste des membres de l'entreprise |
| `POST` | `/companies/members` | Admin | Créer un membre (soumis au quota du plan) |
| `PATCH` | `/companies/members/:id/role` | Admin | Changer le `companyRole` d'un membre |
| `DELETE` | `/companies/members/:id` | Admin | Retirer un membre (suspension douce, réversible) |
| `GET` | `/companies/me/activity-log` | Connecté | Journal d'activité de l'équipe (`?action=&userId=&page=`) |

**`POST /companies/register`** — body :
```json
{ "companyNom": "Atelier Khady", "nom": "Sarr", "prenom": "Khady", "telephone": "770000001", "password": "..." }
```
Réponse `201` :
```json
{
  "message": "Entreprise et compte administrateur créés avec succès.",
  "token": "eyJhbGciOi...",
  "company": { "id": 1, "nom": "Atelier Khady", "statut": "actif", "...": "..." },
  "user": { "id": 1, "nom": "Sarr", "prenom": "Khady", "telephone": "770000001", "role": "entreprise", "companyId": 1, "companyRole": "admin" }
}
```

**`POST /auth/login`** — cas normal (`200`) :
```json
{ "message": "Connexion réussie !", "token": "eyJhbGciOi...", "user": { "id": 1, "nom": "Sarr", "prenom": "Khady", "telephone": "770000001", "role": "entreprise", "companyId": 1, "companyRole": "admin", "platformRole": null } }
```
Si la 2FA est activée sur le compte (`200`, pas encore de token final) :
```json
{ "requiresTwoFactor": true, "method": "email", "tempToken": "eyJhbGciOi...", "devCode": "483920" }
```
*(`devCode` n'apparaît jamais en production — uniquement en dev sans SMTP configuré.)*

**`POST /auth/2fa/verify`** — body `{ "tempToken": "...", "code": "483920" }` → même forme de
réponse que `login` réussi.

**`GET /companies/me/activity-log`** — réponse `200` :
```json
{
  "data": [
    { "id": 42, "action": "facture.paiement_enregistre", "objectType": "Invoice", "objectId": 7,
      "details": { "numero": "FAC-2026-0007", "montant": 15000 }, "auteur": "Khady Sarr", "createdAt": "2026-09-29T10:00:00.000Z" }
  ],
  "total": 42, "page": 1, "totalPages": 1
}
```

---

## 3. Clients & prospects (CRM)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `GET` | `/crm/customers` | Lecture | Liste (`?statut=prospect\|client&segment=&search=&page=`) |
| `GET` | `/crm/customers/check-duplicate` | Lecture | Détection de doublon (téléphone/email), non bloquante |
| `POST` | `/crm/customers` | Écriture | Créer un client/prospect |
| `GET` | `/crm/customers/:id` | Lecture | Détail + contacts |
| `PUT` | `/crm/customers/:id` | Écriture | Modifier |
| `PATCH` | `/crm/customers/:id/convert` | Écriture | Prospect → client |
| `GET` | `/crm/customers/:customerId/statement` | Lecture | Relevé (factures, avoirs, solde dû) |
| `GET` | `/crm/customers/:customerId/statement/pdf` | Lecture | Relevé en PDF |
| `GET`/`POST` | `/crm/customers/:customerId/contacts` | — | Contacts liés à un client |
| `PUT`/`DELETE` | `/crm/contacts/:id` | Écriture | Modifier/supprimer un contact |
| `GET` | `/crm/customers/export` | Lecture | Export CSV |

**`POST /crm/customers`** — body :
```json
{ "nom": "Boutique Diallo", "type": "entreprise", "telephone": "781234567", "email": "contact@diallo.sn" }
```
Réponse `201` :
```json
{
  "customer": { "id": 5, "companyId": 1, "nom": "Boutique Diallo", "type": "entreprise", "statut": "prospect", "telephone": "781234567", "email": "contact@diallo.sn", "createdAt": "..." },
  "warnings": { "possibleDuplicates": [{ "id": 2, "nom": "Diallo Fatou", "telephone": "781234567", "statut": "client" }] }
}
```
*(`warnings` absent s'il n'y a aucun doublon détecté.)*

---

## 4. Catalogue produits/services

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `GET` | `/crm/products` | Lecture | Liste (`?type=produit\|service&categorie=&search=&page=`) |
| `POST` | `/crm/products` | Écriture | Créer (variantes réservées Pro+) |
| `GET` | `/crm/products/:id` | Lecture | Détail |
| `PUT` | `/crm/products/:id` | Écriture | Modifier |
| `GET` | `/crm/products/export` | Lecture | Export CSV |

```json
{ "id": 3, "reference": "BOU-001", "nom": "Boubou brodé", "type": "produit", "prixUnitaire": 45000, "tauxTaxe": 18, "unite": "pièce", "disponible": true, "statut": "actif" }
```

---

## 5. Pipeline commercial (Pro+)

Gaté par `PLAN_FEATURE_KEYS.CRM_PIPELINE`.

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `GET`/`POST` | `/crm/pipeline-stages` | — | Étapes du pipeline (configurables) |
| `PUT`/`DELETE` | `/crm/pipeline-stages/:id` | Écriture | Modifier/supprimer une étape |
| `GET` | `/crm/opportunities/forecast` | Lecture | Prévision de CA pondérée |
| `GET` | `/crm/opportunities` | Lecture | Liste (`?stageId=&statut=&assignedToUserId=&page=`) |
| `POST` | `/crm/opportunities` | Écriture | Créer une opportunité |
| `GET` | `/crm/opportunities/:id` | Lecture | Détail |
| `PUT` | `/crm/opportunities/:id` | Écriture | Modifier (hors étape) |
| `PATCH` | `/crm/opportunities/:id/stage` | Écriture | Déplacer vers une autre étape (dérive `statut`/`dateCloture`) |
| `GET`/`POST` | `/crm/tasks` | — | Tâches / rappels / rendez-vous (`type: tache\|rappel\|rendez_vous`) |
| `PATCH` | `/crm/tasks/:id/{assign,reschedule,cancel,complete}` | — | Actions sur une tâche |

**`GET /crm/opportunities/forecast`** :
```json
{
  "nombreOpportunitesOuvertes": 4,
  "totalValeur": 850000,
  "totalPondere": 412500,
  "parEtape": [{ "stageId": 2, "nom": "Négociation", "ordre": 2, "nombre": 2, "valeur": 500000, "pondere": 300000 }]
}
```

---

## 6. Devis, commandes, factures

Écriture réservée à `admin`/`manager`/`commercial` ; lecture ouverte à tout membre (y compris
`readonly`). Statuts (transitions via `PATCH`) :
- **Devis** : `brouillon → envoye → accepte|refuse|expire` → `convert-to-order`
- **Commande** : `brouillon → confirmee → en_preparation → livree` (ou `annulee`) → `convert-to-invoice`
- **Facture** : `brouillon → envoyee → [annulee]` ; paiements enregistrés dessus ; `credit-note` génère un avoir

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/crm/quotes` | Créer un devis (`customerId`, `lines[]` optionnelles) |
| `GET` | `/crm/quotes` / `/:id` | Liste / détail |
| `POST`/`PUT`/`DELETE` | `/crm/quotes/:id/lines[/:lineId]` | Lignes (brouillon uniquement) |
| `PATCH` | `/crm/quotes/:id/{send,accept,refuse,expire}` | Transitions de statut |
| `POST` | `/crm/quotes/:id/convert-to-order` | Devis accepté → commande |
| `GET` | `/crm/quotes/:id/pdf` | PDF |
| `POST` | `/crm/orders` | Créer une commande directe |
| `PATCH` | `/crm/orders/:id/{confirm,start-preparation,deliver,cancel}` | Transitions |
| `POST` | `/crm/orders/:id/convert-to-invoice` | Commande confirmée/livrée → facture |
| `GET` | `/crm/orders/:id/pdf` / `/delivery-note` | Bon de commande / bon de livraison PDF |
| `POST` | `/crm/invoices` | Créer une facture directe |
| `PATCH` | `/crm/invoices/:id/{send,cancel}` | Transitions |
| `POST` | `/crm/invoices/:id/credit-note` | Créer un avoir (Pro+, intégral ou partiel) |
| `POST` | `/crm/invoices/:id/payments` | Enregistrer un règlement |
| `GET` | `/crm/invoices/:id/pdf` / `/payments/:paymentId/receipt` | Facture / reçu PDF |
| `POST` | `/crm/invoices/:id/paytrack/pay` | Lien de paiement en ligne (PayTrack) |

**`POST /crm/quotes`** — body :
```json
{ "customerId": 5, "dateValidite": "2026-10-15", "lines": [{ "designation": "Confection sur mesure", "quantite": 2, "prixUnitaire": 25000, "tauxTaxe": 18 }] }
```
Réponse `201` (numérotation automatique `DEV-2026-0001`) :
```json
{
  "id": 12, "numero": "DEV-2026-0001", "statut": "brouillon", "customerId": 5, "siteId": 1,
  "sousTotal": 50000, "totalTaxes": 9000, "totalTTC": 59000, "remiseGlobale": 0,
  "lignes": [{ "id": 30, "designation": "Confection sur mesure", "quantite": 2, "prixUnitaire": 25000, "tauxTaxe": 18, "ordre": 0 }]
}
```

**`POST /crm/invoices/:id/payments`** — body `{ "montant": 15000, "moyen": "mobile_money" }` →
réponse `201` :
```json
{
  "payment": { "id": 8, "invoiceId": 7, "montant": 15000, "moyen": "mobile_money", "datePaiement": "2026-09-29T..." },
  "invoice": { "id": 7, "numero": "FAC-2026-0007", "totalTTC": 59000, "montantPaye": 15000, "soldeRestant": 44000, "paymentStatus": "partiellement_payee" }
}
```

**`GET /crm/customers/:customerId/statement`** :
```json
{ "customer": { "id": 5, "nom": "Boutique Diallo" }, "totalFacture": 59000, "totalAvoir": 0, "totalPaye": 15000, "soldeDu": 44000, "documents": [ "...factures/avoirs envoyés..." ] }
```

---

## 7. Fournisseurs & achats

Disponible dès l'Essentiel. Écriture réservée à `admin`/`manager`/`stock`. Mêmes statuts/PDF que
les commandes/factures clients, transposés côté fournisseur (`commande_achat` : `brouillon → envoyee
→ confirmee → recue` ou `annulee`).

| Méthode | Route | Description |
|---|---|---|
| `GET`/`POST` | `/crm/suppliers` | Liste / créer |
| `GET`/`PUT` | `/crm/suppliers/:id` | Détail / modifier |
| `GET` | `/crm/suppliers/:id/statement` | Relevé fournisseur |
| `GET`/`POST`/`PUT`/`DELETE` | `/crm/suppliers/:supplierId/contacts[/:id]` | Contacts fournisseur |
| `GET`/`POST`/`PUT`/`DELETE` | `/crm/suppliers/:supplierId/products[/:id]` | Catalogue fournisseur (prix d'achat) |
| `GET`/`POST` | `/crm/purchase-orders` | Liste / créer un bon de commande fournisseur |
| `PATCH` | `/crm/purchase-orders/:id/{send,confirm,receive,cancel}` | Transitions (`receive` alimente le stock) |
| `POST` | `/crm/purchase-orders/:id/payments` | Règlement fournisseur |
| `GET` | `/crm/purchase-orders/:id/pdf` | PDF |

---

## 8. Stock & sites

Disponible dès l'Essentiel (alertes de seuil et valorisation réservées Pro+). Écriture réservée à
`admin`/`manager`/`stock`. Seul `admin` peut forcer un stock négatif (`forcerStockNegatif: true`).

| Méthode | Route | Description |
|---|---|---|
| `GET`/`POST` | `/crm/sites` | Sites/points de vente (soumis au quota du plan) |
| `PUT` | `/crm/sites/:id` | Modifier / activer-désactiver |
| `GET` | `/crm/stock` | Niveaux de stock (`?siteId=&productId=`) |
| `GET` | `/crm/stock/alerts` | Produits sous le seuil d'alerte (Pro+) |
| `GET` | `/crm/stock/valuation` | Valorisation totale (Pro+) |
| `PUT` | `/crm/stock/:id/threshold` | Définir le seuil d'alerte (Pro+) |
| `GET`/`POST` | `/crm/stock/movements` | Historique / créer un mouvement (`entree`/`sortie`/`ajustement`) |
| `POST` | `/crm/stock/inventaire` | Comptage physique → delta automatique |
| `GET` | `/crm/stock/export` | Export CSV |

**`GET /crm/stock/valuation`** :
```json
{ "nombreReferences": 12, "quantiteTotale": 340, "valeurTotale": 4250000 }
```

**`POST /crm/stock/movements`** — body `{ "productId": 3, "siteId": 1, "type": "entree", "quantite": 50, "coutUnitaire": 12000 }`
→ réponse `201` : StockItem mis à jour + mouvement créé (objet retourné par `applyStockMovement`,
contient `item` et `movement`).

---

## 9. Rentabilité

Simulations/coûts disponibles dès l'Essentiel ; comparaisons, scénarios, sensibilité, prévisionnel
vs réel, trésorerie et score sont réservés Pro+ (`RENTABILITE_AVANCEE`).

| Méthode | Route | Description |
|---|---|---|
| `GET`/`POST` | `/crm/profitability/simulations` | Liste / créer une simulation de marge |
| `GET`/`PUT` | `/crm/profitability/simulations/:id` | Détail / modifier |
| `PATCH` | `/crm/profitability/simulations/:id/{archive,restore}` | Archiver/restaurer |
| `POST` | `/crm/profitability/simulations/:id/duplicate` | Dupliquer |
| `POST`/`PUT`/`DELETE` | `/crm/profitability/simulations/:id/costs[/:costId]` | Coûts de la simulation |
| `POST` | `/crm/profitability/simulations/:id/target-profit` | Prix nécessaire pour un profit cible (Pro+) |
| `GET` | `/crm/profitability/simulations/:id/scenarios` | Scénarios optimiste/pessimiste (Pro+) |
| `POST` | `/crm/profitability/simulations/:id/sensitivity` | Analyse de sensibilité (Pro+) |
| `POST` | `/crm/profitability/simulations/:id/discount-simulation` | Simuler une remise (Pro+) |
| `GET` | `/crm/profitability/simulations/compare` | Comparer plusieurs simulations (Pro+) |
| `GET` | `/crm/profitability/supplier-comparison` | Comparer des fournisseurs (Pro+) |
| `GET` | `/crm/profitability/simulations/:id/previsionnel-vs-reel` | Écart prévisionnel/réel (Pro+, nécessite un `productId` lié) |
| `GET` | `/crm/profitability/tresorerie` | Projection encaissements/décaissements (Pro+, `?semaines=&soldeActuel=`) |
| `GET` | `/crm/profitability/score` | Score de santé financière /100 (Pro+) |
| `GET` | `/crm/profitability/score/historique` | Évolution mensuelle du score (Pro+, `?mois=12`) |

**`GET /crm/profitability/score`** — méthodologie définie avec la direction ATAABA (M. Bamba,
2026-09-29) : 6 postes pondérés reprenant des ratios financiers standards (marge brute, ratio de
liquidité, DSO, DPO, rotation de stock...). Voir `profitabilityCalculationService.ts` pour le détail
des formules et des limites assumées (pas de marge nette faute de suivi des charges d'exploitation,
seuils non encore différenciés par secteur/taille d'entreprise). Enregistre aussi un instantané
mensuel consultable ensuite via `/score/historique`.
```json
{
  "score": 74,
  "label": "Situation financière satisfaisante",
  "pointsForts": ["Bonne marge commerciale", "Bon recouvrement des créances"],
  "pointsAttention": ["rotation des stocks insuffisante ou stock dormant"],
  "details": [
    { "dimension": "Rentabilité et marges", "poids": 30, "note": 80,
      "sousIndicateurs": [{ "nom": "Marge brute (%)", "valeurBrute": 40, "note": 80 }] },
    { "dimension": "Liquidité et trésorerie", "poids": 20, "note": 65,
      "sousIndicateurs": [{ "nom": "Ratio de liquidité court terme (%)", "valeurBrute": 65, "note": 65 }] },
    { "dimension": "Créances clients", "poids": 15, "note": 70,
      "sousIndicateurs": [
        { "nom": "Taux d'impayés (%)", "valeurBrute": 10, "note": 80 },
        { "nom": "Délai moyen d'encaissement — DSO (jours)", "valeurBrute": 35, "note": 60 }
      ] },
    { "dimension": "Performance du chiffre d'affaires", "poids": 15, "note": 75, "sousIndicateurs": ["..."] },
    { "dimension": "Gestion des stocks", "poids": 10, "note": 40, "sousIndicateurs": ["..."] },
    { "dimension": "Dettes et fournisseurs", "poids": 10, "note": 85, "sousIndicateurs": ["..."] }
  ]
}
```

**`GET /crm/profitability/score/historique?mois=6`** :
```json
{ "data": [{ "mois": "2026-08-01", "score": 68, "details": ["..."] }, { "mois": "2026-09-01", "score": 74, "details": ["..."] }] }
```
*(Historique réel à partir de la mise en place de la fonctionnalité — pas de reconstruction rétroactive, voir JOURNAL.md.)*

**`GET /crm/profitability/tresorerie?semaines=4`** :
```json
{
  "semaines": [
    { "debut": "2026-09-29", "fin": "2026-10-05", "encaissements": 120000, "decaissements": 45000, "net": 75000 },
    { "debut": "...", "fin": "...", "encaissements": 0, "decaissements": 30000, "net": -30000, "enRetard": true }
  ]
}
```

---

## 10. Tableau de bord

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/crm/dashboard?from=&to=` | Indicateurs agrégés (filtrés selon la formule) |

Réponse `200` (sections `null` si la formule ne les inclut pas) :
```json
{
  "periode": { "from": "2026-09-01T00:00:00.000Z", "to": "2026-09-30T23:59:59.999Z" },
  "commercial": { "nombreDevis": 8, "nombreCommandes": 5, "pipeline": { "...": "si Pro+" } },
  "finance": { "ca": 590000, "creances": 44000, "impayes": 12000 },
  "produits": null,
  "stocks": null,
  "fournisseurs": null,
  "equipeCommerciale": null,
  "parSite": null
}
```
*(`produits`/`stocks`/`fournisseurs` = Pro+, `equipeCommerciale` = Business, `parSite` = Business.)*

---

## 11. Facturation de l'abonnement Naatalix (DexPay)

| Méthode | Route | Accès | Description |
|---|---|---|---|
| `POST` | `/companies/me/subscription/dexpay/subscribe` | Admin | Initie le paiement (renvoie l'URL de paiement DexPay) |
| `POST` | `/companies/me/subscription/dexpay/cancel` | Admin | Demande l'annulation (effective à la confirmation webhook) |
| `POST` | `/integrations/dexpay/webhook` | Public (signature HMAC) | Callback DexPay — active/suspend l'abonnement |

**`POST /companies/me/subscription/dexpay/subscribe`** — body `{ "cycle": "mensuel" }` → `201` :
```json
{ "checkoutUrl": "https://checkout.dexpay.africa/...", "dexpaySubscriptionId": "sub_xxx" }
```
> **Important** : l'abonnement Naatalix n'est **jamais** activé directement par cet appel — seule
> la confirmation par webhook signé (`checkout.completed` / `subscription.payment.succeeded`) active
> réellement l'accès, pour ne jamais activer un paiement non confirmé côté DexPay.

Le webhook est authentifié par le header `X-Webhook-Signature` (HMAC-SHA256 du corps brut, même
clé que `DEXPAY_SECRET_KEY`) — jamais par JWT.

---

## 12. Support (tickets)

Jamais gaté par abonnement (une entreprise suspendue doit pouvoir contacter le support).

| Méthode | Route | Description |
|---|---|---|
| `POST` | `/support/tickets` | Ouvrir un ticket (`sujet`, `message`, `categorie?`, `priorite?`) |
| `GET` | `/support/tickets` | Mes tickets (`?statut=`) |
| `GET` | `/support/tickets/:id` | Détail (sans les notes internes du personnel) |
| `POST` | `/support/tickets/:id/messages` | Répondre dans le fil |

---

## 13. Back-office ATAABA (personnel plateforme)

Realm séparé (`role: 'ataaba_staff'`, `platformRole: superadmin\|support\|readonly`), revalidé en
base à chaque requête. Toute écriture est journalisée dans `AuditLog` (jamais visible depuis le
journal d'activité d'une entreprise).

| Méthode | Route | Rôle requis | Description |
|---|---|---|---|
| `GET`/`POST` | `/backoffice/staff` | superadmin | Gestion du personnel ATAABA |
| `PATCH` | `/backoffice/staff/:id/status` | superadmin | Suspendre/réactiver un membre du staff |
| `POST` | `/backoffice/2fa/{setup,confirm,disable}` | tout staff | 2FA TOTP (compte appelant) |
| `POST` | `/backoffice/staff/:id/2fa/reset` | superadmin | Réinitialiser la 2FA d'un collègue (récupération) |
| `GET` | `/backoffice/stats` | tout staff | Statistiques globales de la plateforme |
| `GET` | `/backoffice/audit-logs` | superadmin | Journal interne complet (toutes entreprises) |
| `GET`/`POST`/`PUT` | `/backoffice/plans` | — | Formules d'abonnement |
| `GET` | `/backoffice/companies` / `/:id` / `/:id/members` | tout staff | Liste/détail entreprises |
| `PATCH` | `/backoffice/companies/:id/{suspend,reactivate}` | superadmin | Suspendre/réactiver une entreprise |
| `PATCH`/`POST` | `/backoffice/companies/:id/subscription/*` | superadmin | Changer de plan, renouveler, prolonger l'essai |
| `GET` | `/backoffice/integrations/{paytrack,dexpay}/events` | support+ | Historique des événements webhook |
| `GET`/`POST`/`PATCH` | `/backoffice/tickets*` | support+ | Traiter les tickets support (avec notes internes) |

**`POST /backoffice/2fa/setup`** :
```json
{ "otpauthUrl": "otpauth://totp/Naatalix:770000099?secret=...", "qrCodeDataUrl": "data:image/png;base64,..." }
```

---

## 14. Codes d'erreur transverses

| Code | Statut HTTP | Signification |
|---|---|---|
| `QUOTA_EXCEEDED` | 403 | Limite d'utilisateurs/sites du plan atteinte |
| `FEATURE_NOT_IN_PLAN` | 403 | Fonctionnalité non incluse dans la formule actuelle |
| `SUBSCRIPTION_INACTIVE` | 403 | Abonnement suspendu/expiré (lecture seule) |
| `DEXPAY_NOT_CONFIGURED` | 503 | Clés DexPay absentes de l'environnement serveur |
| `DEXPAY_PRODUCT_NOT_CONFIGURED` | 503 | Produit DexPay non créé pour ce plan/cycle |

---

*Dernière mise à jour : 2026-09-29. Pour le détail des décisions de conception, règles métier et
limites connues de chaque module, voir `JOURNAL.md` à la racine du dépôt.*
