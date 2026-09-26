# Journal de développement backend Naatalix

Ce journal conserve les décisions, vérifications, résultats de tests et limites rencontrées pendant la transformation progressive de ModèlePro en Naatalix.

## 2026-09-22 - Initialisation de la roadmap

### Contexte

- Branche de travail : `naatalix-dev`.
- Les cahiers `Cahier_des_charges_Naatalix_ATAABA.docx` et `Cahier_des_charges_Module_Naatalix_Rentabilite.docx` sont les références fonctionnelles.
- ModèlePro reste le socle existant ; aucune fonctionnalité existante n'est supprimée dans cette étape.

### État constaté

- Backend dans `modelepro-backend`.
- Stack : Express, TypeScript, Sequelize, PostgreSQL et SQLite pour les tests.
- Tests : Jest + Supertest.
- API existante versionnée sous `/api/v1`.
- Modèles ModèlePro déjà présents : utilisateurs, clients, artisans, catalogue, rendez-vous, commandes, avis, réclamations, messages, notifications, paiements et portefeuille.
- Aucun module Naatalix n'a encore été ajouté.

### Décisions

- Développement par module et par priorité.
- Ordre retenu : fondations, CRM, ERP, rentabilité/pilotage, abonnements/PayTrack/back-office.
- Chaque module doit passer les tests ciblés, la suite complète de non-régression et le build TypeScript.
- Les règles métier seront placées dans des services testables, pas uniquement dans les contrôleurs.
- Les données Naatalix devront être isolées par entreprise.

### Vérifications à faire avant le premier développement

- `npm test` depuis `modelepro-backend`.
- `npm run build` depuis `modelepro-backend`.
- Reporter ici la date, le résultat, la durée éventuelle et toute erreur avant de commencer le module Organisation/Tenant.

### Fichiers de référence

- `ROADMAP_BACKEND.md` : ordre des modules, méthode de livraison et critères d'acceptation.
- `SPEC.md` : état et fonctionnement ModèlePro.
- `README.md` : structure et commandes du projet.

## 2026-09-22 - Phase 0 : audit initial du backend

### Contexte

- Branche : `naatalix-dev` (confirmée via `git branch --show-current`).
- Dépôt confirmé : `C:\Users\HP\Desktop\ATAABA-Stage\Projets\modelpro`.

### Fichiers lus intégralement

- `ROADMAP_BACKEND.md`, `JOURNAL.md`, `README.md`, `SPEC.md`.
- `Cahier_des_charges_Naatalix_ATAABA.docx` et `Cahier_des_charges_Module_Naatalix_Rentabilite.docx` (extraits en texte via `unzip` + parsing XML, car non lisibles nativement — les deux cahiers utilisent en interne le nom **Bizora**, confirmant que Bizora = ancien nom de Naatalix, ATAABA Expertise étant le porteur).
- `modelepro-backend/package.json`, `src/app.ts`, `src/server.ts`, `src/config/database.ts`, `src/models/index.ts`.
- `modelepro-backend/AUDIT_BACKEND_V1.md` (audit V1 existant : 79/79 fonctionnalités ModèlePro déclarées implémentées).
- `src/middlewares/authMiddleware.ts`, `src/utils/auth.ts` (lus directement).
- Inventaire complet de `src/models/*`, `src/routes/*`, `src/controllers/*`, `src/services/*`, `src/__tests__/*` réalisé via un agent d'exploration dédié (lecture seule).

### Commandes exécutées

```
git branch --show-current
cd modelepro-backend && npm test
cd modelepro-backend && npm run build
cd modelepro-backend && npx jest src/__tests__/message.test.ts   # isolement de l'échec
grep -rn "process.env\." src --include="*.ts"
find . -iname "*migration*"
```

### Résultats

- **Tests** : 13/14 suites passantes, 124/126 tests passants, 1 skip. 1 échec dans `message.test.ts` (« accepte l'envoi d'une photo ») causé par `Error: Must supply api_key` (Cloudinary) — **échec d'environnement** (pas de `.env` local avec les identifiants Cloudinary), pas une régression de code.
- **Build** : `tsc` passe sans aucune erreur.
- **Sécurité** : `JWT_SECRET` a une valeur par défaut codée en dur (`'SUPER_SECRET_KEY_MODELE_PRO_2026_ESTM'`), dupliquée à l'identique dans 3 fichiers (`config/database.ts`, `middlewares/authMiddleware.ts`, `utils/auth.ts`). Aucun secret réel n'est commit (`.env` bien ignoré par `.gitignore`), mais le fallback est dangereux si la variable n'est pas positionnée en production.
- **Multi-tenant** : aucune notion d'organisation/tenant dans le code actuel (confirmé modèles + tests). Isolation uniquement par `userId`/`artisanId`/`clientId`.
- **Transactions** : aucune utilisation de `sequelize.transaction` dans tout `src` — plusieurs opérations métier multi-tables sensibles (paiement → wallet → commande, suppression artisan → suppression user, recalcul moyenne avis) sont non atomiques.
- **Migrations** : pas de dossier `migrations/` ni de `sequelize-cli` ; schéma géré par ~40 `ALTER TABLE IF NOT EXISTS` codés en dur + `sequelize.sync({force:false})` au démarrage.
- **Failles d'autorisation repérées** (à confirmer/corriger avant d'exposer davantage l'API) : `messageController.markMessageAsRead` et plusieurs endpoints de `paymentController` (`getPaymentsByOrder`, `getPaymentSummary`, `updatePaymentStatus`) n'effectuent pas de vérification d'ownership — un utilisateur authentifié peut agir sur des ressources d'un autre utilisateur en devinant un id.

### Décisions recommandées

- Ne pas commencer le développement du module CRM avant Phase 0 complète : d'abord centraliser `JWT_SECRET` (une seule source, échec explicite si absent en production), ajouter des transactions Sequelize sur les flux argent (paiement/wallet), et corriger les vérifications d'ownership manquantes signalées ci-dessus — ce sont des correctifs ModèlePro, pas des ajouts Naatalix, donc sans risque de régression fonctionnelle s'ils sont bien testés.
- Premier module Naatalix recommandé après ces correctifs : `Organisation/Company` (tenant) + rattachement des `User` existants, conformément à l'ordre de démarrage de `ROADMAP_BACKEND.md`.

### Prochaine étape

Présentation du rapport d'audit à l'utilisateur (voir conversation) ; en attente de validation avant toute implémentation.

## 2026-09-22 - Correctifs de sécurité ModèlePro (préalable Phase 0)

### Objectif

Corriger les 3 risques identifiés lors de l'audit Phase 0 avant d'ajouter du code Naatalix, sans changer le comportement fonctionnel de ModèlePro.

### Fichiers ajoutés/modifiés

- `src/config/database.ts` : `JWT_SECRET` devient la source unique — lève une erreur explicite au démarrage si absent hors environnement de test (au lieu d'un fallback codé en dur silencieux).
- `src/middlewares/authMiddleware.ts`, `src/utils/auth.ts` : suppression des fallbacks JWT dupliqués, import depuis `config/database.ts`.
- `src/controllers/messageController.ts` : `markMessageAsRead` vérifie désormais que l'appelant est bien client ou artisan de la commande liée au message (403 sinon).
- `src/controllers/paymentController.ts` : ajout d'une vérification d'ownership (`canAccessPayment`) sur `getPaymentsByOrder`, `getPaymentSummary`, `updatePaymentStatus` (client/artisan de la commande, ou admin). `applyConfirmedOrderPaymentEffect` enveloppée dans `sequelize.transaction` (order.paymentStatus + crédit WalletTransaction atomiques).
- `src/services/walletService.ts`, `src/controllers/walletController.ts` : `requestWithdrawal` verrouille la ligne `Artisan` (`transaction.LOCK.UPDATE`) et relit le solde à l'intérieur de la transaction pour éviter un double retrait au-delà du solde disponible.
- `src/controllers/adminController.ts` : `deleteArtisanAdmin` enveloppée dans une transaction (artisan + user supprimés ensemble ou pas du tout).
- Tests ajoutés : `src/__tests__/message.test.ts` (ownership `markMessageAsRead`), `src/__tests__/payment.test.ts` (test 5b, ownership sur 3 endpoints paiement).

### Règles métier

- Un paiement n'est visible/modifiable que par l'admin, le client ou l'artisan de la commande concernée (ou l'artisan lui-même pour un abonnement).
- Un message ne peut être marqué lu que par un participant de la commande associée.

### Commandes exécutées / Résultats

```
npm run build   → OK, aucune erreur
npm test        → 127/129 passants, 1 skip, 1 échec (Cloudinary, environnemental, pré-existant)
```

Aucune régression sur la suite ModèlePro.

## 2026-09-22 - Module 1 (CRM) : Organisation / Tenant

### Objectif

Premier module Naatalix conformément à `ROADMAP_BACKEND.md` §13 : poser le socle multi-entreprises avant tout module métier CRM/ERP.

### Fichiers ajoutés/modifiés

- `src/models/Company.ts` (nouveau) : entité tenant (nom, ninea, rccm, adresse, contact, logoUrl, statut).
- `src/models/User.ts` : ajout `companyId` (nullable, FK `companies.id`, `SET NULL`) et `companyRole` (`admin|manager|commercial|finance|stock|readonly`, nullable) ; extension de l'ENUM `role` avec la valeur `entreprise` (aucune valeur existante retirée — `client`/`artisan`/`admin` intacts).
- `src/middlewares/tenantMiddleware.ts` (nouveau) : `requireCompany` (401/403 si le token ne porte pas de `companyId`), `requireCompanyRole(...roles)` (contrôle `companyRole`, distinct du `role` plateforme).
- `src/middlewares/authMiddleware.ts`, `src/utils/auth.ts`, `src/controllers/authController.ts` : le JWT et la réponse de login embarquent `companyId`/`companyRole` quand `role === 'entreprise'`.
- `src/controllers/companyController.ts`, `src/routes/companyRoutes.ts` (nouveaux) : `POST /companies/register` (crée entreprise + premier utilisateur `companyRole=admin` en une transaction), `GET/PUT /companies/me`, `GET/POST /companies/members`, `PATCH /companies/members/:id/role`, `DELETE /companies/members/:id` (retrait doux : suspendu + détaché, pas de suppression physique).
- `src/app.ts` : montage de `companyRoutes` sur `/api/v1/companies`, import du modèle `Company`.
- `src/models/index.ts` : ajout de `Company` et correction d'une omission préexistante (`WalletTransaction` n'y était pas exporté).
- `src/server.ts` : ajout des migrations manuelles Postgres (`company_id`, `company_role` sur `users`, extension de l'ENUM `enum_users_role`) — la table `companies` est créée automatiquement par `sequelize.sync`.
- Tests ajoutés : `src/__tests__/company.test.ts` (12 tests : création entreprise+admin, login avec companyId/companyRole, permissions par companyRole, **isolation stricte entre deux entreprises** — lecture et modification croisées bloquées —, rejet d'un compte ModèlePro sans entreprise sur les routes `/companies`).

### Règles métier

- Un compte Naatalix a `role = 'entreprise'` (distinct des rôles ModèlePro `client/artisan/admin`, qui restent inchangés) et un `companyRole` propre à son organisation.
- Toute route Naatalix scoped-entreprise passe par `protect` puis `requireCompany` (garantit un `companyId` exploitable comme filtre d'isolation) puis, si besoin, `requireCompanyRole`.
- Seul `companyRole = 'admin'` peut gérer les membres et les infos de l'entreprise.
- Retrait d'un membre = détachement + suspension, jamais une suppression physique (réversible, prépare la conservation d'historique une fois devis/factures ajoutés).

### Commandes exécutées / Résultats

```
npm run build                              → OK
npx jest src/__tests__/company.test.ts     → 12/12 passants (dont isolation tenant)
npm test (suite complète)                  → 139/141 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérification supplémentaire en conditions réelles : serveur lancé en local (`npm run dev`) contre PostgreSQL (`modelpro_dev`), migrations auto appliquées sans erreur, flux complet testé au réel (`POST /companies/register` → `POST /auth/login` → `GET /companies/me` → `GET /companies/members`), données de test nettoyées ensuite.

### Limites connues / décisions restantes

- Pas encore de suspension de compte forcée si `Company.statut = 'suspendu'` au login — prévu en Phase 4 (abonnements).
- Pas de rôles personnalisables au-delà des 6 valeurs fixes (conforme au MVP du cahier des charges, F-002 mentionne "personnalisables si possible").
- Aucune donnée métier CRM ne dépend encore de `companyId` — c'est l'objet du prochain module (Clients/Prospects/Contacts).

### Prochaine étape

Module CRM suivant : Client/Prospect/Contact rattachés à `companyId`, avec conversion prospect → client, conformément à `ROADMAP_BACKEND.md` §6.2.

## 2026-09-22 - Module 1 (CRM) suite : Clients / Prospects / Contacts

### Objectif

Deuxième brique CRM (`ROADMAP_BACKEND.md` §6.2) : fiches prospect/client, contacts, conversion, recherche et détection de doublons, toutes rattachées à `companyId`.

### Fichiers ajoutés/modifiés

- `src/models/Customer.ts` (nouveau) : entité "client/prospect" CRM, table dédiée `crm_customers` — **distincte** du modèle ModèlePro `Client` (profil marketplace d'un utilisateur final), pour éviter toute ambiguïté. Champs : `companyId`, `nom`, `type` (particulier/entreprise), `statut` (prospect/client), `email`, `telephone`, `adresse`, `segment`, `notes`, `assignedToUserId`, `convertedAt`.
- `src/models/Contact.ts` (nouveau) : personne rattachée à un `Customer`, table `crm_contacts`.
- `src/controllers/crmCustomerController.ts`, `src/controllers/crmContactController.ts`, `src/routes/crmRoutes.ts` (nouveaux) : CRUD clients/prospects + contacts, recherche (`search`, `statut`, `segment`, pagination), détection de doublons (même téléphone/email dans la même entreprise — **signalée, jamais bloquante**, cf. `GET /crm/customers/check-duplicate` et le champ `warnings.possibleDuplicates` retourné à la création), conversion `PATCH /crm/customers/:id/convert` (prospect → client, sans ressaisie des champs).
- `src/app.ts`, `src/models/index.ts` : montage de `crmRoutes` sur `/api/v1/crm`, import/export des deux nouveaux modèles.

### Règles métier

- Toute route est `protect` + `requireCompany` ; les écritures (création/modification/conversion/contacts) exigent en plus `companyRole` ∈ {admin, manager, commercial} — la lecture reste ouverte à tout membre, y compris `readonly`.
- Chaque requête est explicitement filtrée par `companyId` (pas seulement au niveau middleware : chaque contrôleur revérifie `where: { id, companyId }`), donc un id deviné d'une autre entreprise retourne 404, jamais les données.
- Un doublon (même téléphone ou email dans la même entreprise) ne bloque jamais la création, conformément à `ROADMAP_BACKEND.md` ("recherche et détection de doublons" — signalement, pas blocage).

### Tests ajoutés

`src/__tests__/crmCustomer.test.ts` (16 tests) : création, permissions par `companyRole` (commercial autorisé à écrire, readonly bloqué en écriture mais autorisé en lecture), détection de doublons, recherche, mise à jour, ajout de contact, conversion prospect→client (+ rejet d'une double conversion), lecture de fiche avec contacts inclus, **isolation stricte entre deux entreprises** (liste, détail, modification, conversion, contacts — tout retourne 404/liste vide pour l'entreprise B sur les données de l'entreprise A), rejet d'un compte ModèlePro sans entreprise.

### Commandes exécutées / Résultats

```
npm run build                                → OK
npx jest src/__tests__/crmCustomer.test.ts   → 16/16 passants
npm test (suite complète)                    → 155/157 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : `sequelize.sync` crée les tables `crm_customers`/`crm_contacts` sans erreur, flux réel testé (création entreprise → création prospect → conversion en client), données de test nettoyées ensuite.

### Limites connues / décisions restantes

- Pas d'historique détaillé des modifications (audit trail) sur `Customer`/`Contact` — prévu par l'entité `AuditLog` dédiée du cahier des charges (Phase 5), pas dupliqué ici.
- Pas de suppression de client/prospect dans cette première version (non requis par la roadmap à ce stade ; à ajouter si un besoin métier se confirme).
- `assignedToUserId` (commercial responsable) est stocké mais pas encore exploité — utile pour le prochain module (Opportunités/Pipeline).

### Prochaine étape

Module CRM suivant : Opportunités et pipeline commercial (`ROADMAP_BACKEND.md` §6.3), rattachées à `Customer` et `assignedToUserId`.

## 2026-09-22 - Module 1 (CRM) suite : Opportunités et pipeline commercial

### Objectif

Troisième brique CRM (`ROADMAP_BACKEND.md` §6.3) : opportunités, étapes de pipeline configurables, prévision de chiffre d'affaires.

### Fichiers ajoutés/modifiés

- `src/models/PipelineStage.ts` (nouveau) : étape de pipeline par entreprise (`nom`, `ordre`, `estGagne`, `estPerdu`), table `crm_pipeline_stages`.
- `src/models/Opportunity.ts` (nouveau) : opportunité CRM (table `crm_opportunities`) — `customerId`, `stageId`, `valeur`, `probabilite` (0-100), `assignedToUserId`, `prochaineAction`/`dateProchaineAction`, `statut` (ouverte/gagnee/perdue) et `dateCloture` **dérivés automatiquement** de l'étape courante.
- `src/services/crmSeedService.ts` (nouveau) : `seedDefaultPipelineStages` — 6 étapes par défaut (Prospection, Qualification, Proposition, Négociation, Gagné, Perdu) créées automatiquement à l'inscription d'une entreprise (`companyController.registerCompany`), tout en restant personnalisables ensuite.
- `src/controllers/pipelineStageController.ts`, `src/controllers/opportunityController.ts`, `src/routes/crmRoutes.ts` : CRUD étapes (suppression bloquée si des opportunités l'utilisent encore), CRUD opportunités, `PATCH /crm/opportunities/:id/stage` (changement d'étape = point d'écriture unique pour `statut`/`dateCloture`, évite toute divergence), `GET /crm/opportunities/forecast` (prévision de CA pondérée : Σ valeur × probabilité, globale et par étape, sur les opportunités `ouverte` uniquement).
- `src/app.ts`, `src/models/index.ts` : import/export des deux nouveaux modèles.

### Règles métier

- Le statut d'une opportunité (`ouverte`/`gagnee`/`perdue`) n'est jamais modifié directement : il découle toujours du flag `estGagne`/`estPerdu` de l'étape vers laquelle elle est déplacée (`applyStageEffect`, seul point d'écriture).
- La probabilité est systématiquement bornée entre 0 et 100 côté serveur.
- Une étape utilisée par au moins une opportunité ne peut pas être supprimée (400 explicite).
- Le calcul de prévision ne porte que sur les opportunités `ouverte` — cohérent avec le critère de validation ROADMAP ("calcul de prévision cohérent").

### Tests ajoutés

`src/__tests__/crmOpportunity.test.ts` (15 tests) : seed automatique des 6 étapes par défaut, ajout d'étape personnalisée, création d'opportunité sur la première étape, permission readonly bloquée en écriture, bornage de la probabilité, liste filtrée par étape avec pagination, mise à jour des champs génériques, calcul de prévision pondérée, déplacement vers "Gagné" (statut + dateCloture mis à jour), sortie de l'opportunité gagnée du calcul de prévision, refus de suppression d'une étape utilisée, suppression d'une étape libre, **isolation stricte entre deux entreprises** (étapes, liste, détail, déplacement d'étape, prévision de CA).

### Commandes exécutées / Résultats

```
npm run build                                  → OK
npx jest src/__tests__/crmOpportunity.test.ts  → 15/15 passants
npm test (suite complète)                      → 170/172 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : tables `crm_pipeline_stages`/`crm_opportunities` créées sans erreur par `sequelize.sync`, flux réel testé (inscription entreprise → 6 étapes seedées → création client → création opportunité → prévision de CA), données de test nettoyées ensuite.

### Limites connues / décisions restantes

- Pas de réordonnancement en masse des étapes (drag & drop) — seule la modification unitaire de `ordre` est exposée, suffisant pour le MVP.
- Pas encore de notification automatique liée à `dateProchaineAction` (relance) — prévu au module "Tâches et relances" suivant.

### Prochaine étape

Module CRM suivant : Tâches, relances et rendez-vous CRM (`ROADMAP_BACKEND.md` §6.4), en étendant/adaptant les rendez-vous existants sans casser ceux de ModèlePro.

## 2026-09-22 - Module 1 (CRM) suite : Tâches, relances et rendez-vous CRM

### Objectif

Quatrième et dernière brique CRM de la Phase 1 (`ROADMAP_BACKEND.md` §6.4) : tâches commerciales, rappels et rendez-vous liés à un prospect/client/opportunité.

### Décision d'architecture

Le modèle ModèlePro `Appointment` (`src/models/Appointment.ts`) est fortement couplé à `Artisan`/`marketplace` (FK `artisanId` obligatoire vers `artisans`). L'étendre pour Naatalix aurait exigé de rendre `artisanId` nullable et d'ajouter `companyId` dessus — risque de régression sur le cœur ModèlePro que la roadmap interdit explicitement. Un nouveau modèle Naatalix dédié a donc été créé à la place, comme pour `Customer` (déjà distinct du `Client` ModèlePro).

### Fichiers ajoutés/modifiés

- `src/models/CrmTask.ts` (nouveau, table `crm_tasks`) : modèle unique couvrant tâche/rappel/rendez-vous (`type`), car les trois partagent le même cycle de vie (assignation, report, annulation, réalisation) — évite trois tables quasi identiques. Champs : `titre`, `description`, `customerId`/`opportunityId` (nullable, l'un ou l'autre ou aucun), `assignedToUserId`, `lieu`, `dateEcheanceInitiale` (fixée à la création, jamais modifiée — trace minimale d'un report sans construire un audit trail générique), `dateEcheance`, `statut` (a_faire/fait/reporte/annule), `motifReport`, `motifAnnulation`, `dateRealisation`, `rappelActif`.
- `src/controllers/crmTaskController.ts`, ajouts dans `src/routes/crmRoutes.ts` : `POST/GET /crm/tasks`, `GET/PUT /crm/tasks/:id`, `PATCH /crm/tasks/:id/assign|reschedule|cancel|complete`.
- `src/app.ts`, `src/models/index.ts` : import/export du nouveau modèle.

### Règles métier

- Création et édition descriptive réservées à `companyRole` ∈ {admin, manager, commercial} (cohérent avec les autres modules CRM).
- `assign/reschedule/cancel/complete` sont en revanche également autorisées à **l'utilisateur assigné** à la tâche, même avec un `companyRole` plus restreint (ex. stock, finance) — sinon un membre ne pourrait jamais agir sur ce qu'on lui a confié. Géré par `canActOnTask` dans le contrôleur, pas par le middleware de route.
- Un report (`reschedule`) ne réécrit jamais `dateEcheanceInitiale` : on peut toujours voir la date d'origine à côté de la date reportée.

### Tests ajoutés

`src/__tests__/crmTask.test.ts` (11 tests) : création avec assignation, refus de création pour un rôle non autorisé, assignation à un membre `stock`, report par l'assigné lui-même (rôle non-manager) avec conservation de `dateEcheanceInitiale`, refus de report par un tiers non assigné et non manager, complétion, création d'un rendez-vous lié à une opportunité, annulation avec motif, filtre par statut + pagination, détail avec client/opportunité inclus, **isolation stricte entre deux entreprises** (liste, détail, complétion).

### Commandes exécutées / Résultats

```
npm run build                              → OK
npx jest src/__tests__/crmTask.test.ts     → 11/11 passants
npm test (suite complète)                  → 181/183 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : table `crm_tasks` créée sans erreur, flux réel testé (création tâche → complétion), données de test nettoyées ensuite.

### Limites connues / décisions restantes

- `rappelActif` est un simple indicateur stocké, pas encore relié à un envoi de notification/email/SMS réel — l'infrastructure de notification programmée sera traitée avec le module Notifications élargi, pas construite prématurément ici.
- Pas de vue "agenda" dédiée (calendrier) — la liste filtrée/paginée existante suffit pour ce stade ; à revisiter si le besoin UI le confirme.

### Fin de la Phase 1 (CRM)

Les 4 briques prévues par `ROADMAP_BACKEND.md` §6 sont livrées et testées : Organisation/Tenant, Clients/Prospects/Contacts, Opportunités/Pipeline, Tâches/Relances/Rendez-vous. Le parcours cible `Prospect -> Opportunité -> Client -> Prochaine action` est bouclé de bout en bout avec isolation stricte multi-entreprises vérifiée à chaque étage. Reste `5. Catalogue CRM` (adapter le catalogue produit/service existant) avant de clore formellement la Phase 1, puis passage à la Phase 2 (ERP commercial : devis, commandes, factures).

### Prochaine étape

`ROADMAP_BACKEND.md` §6.5 — Catalogue CRM : faire évoluer le catalogue ModèlePro (`Creation`) pour accepter produit physique ET service/prestation avec prix, taxe, catégorie, disponibilité, rattachés à `companyId`, sans casser le catalogue artisan existant.

## 2026-09-22 - Module 1 (CRM) fin : Catalogue produits/services — Phase 1 CRM terminée

### Objectif

Cinquième et dernière brique de la Phase 1 (`ROADMAP_BACKEND.md` §6.5) : catalogue produits/services Naatalix, base commune qui sera réutilisée telle quelle par les lignes de devis en Phase 2.

### Décision d'architecture

Même constat que pour `Customer` et `CrmTask` : `Creation` (ModèlePro) a `artisanId` NOT NULL référençant `artisans`, couplage fort au marketplace. Un modèle Naatalix séparé (`Product`, table `crm_products`) a été créé plutôt que d'étendre `Creation`, pour zéro risque de régression sur le catalogue artisan existant.

### Fichiers ajoutés/modifiés

- `src/models/Product.ts` (nouveau) : `reference`, `nom`, `description`, `type` (produit/service), `categorie`, `prixUnitaire`, `tauxTaxe` (%, paramétrable par produit), `unite`, `statut` (actif/inactif), `disponible` (bool), `variantes` (JSON en texte, même convention que `Creation.options`/`photos`).
- `src/controllers/crmProductController.ts`, ajouts dans `src/routes/crmRoutes.ts` : `POST/GET /crm/products`, `GET/PUT /crm/products/:id`, filtres (`type`, `categorie`, `statut`, `disponible`, `search`) + pagination.
- `src/app.ts`, `src/models/index.ts` : import/export du nouveau modèle.

### Règles métier

- Écriture réservée à `companyRole` ∈ {admin, manager, commercial} ; lecture ouverte à tout membre de l'entreprise, cohérent avec les autres modules CRM.
- `statut` (publié/archivé) et `disponible` (en stock/vendable maintenant) sont deux notions distinctes, toutes deux exposées comme demandé par la roadmap ("statut actif/inactif" et "disponibilité" séparément).

### Tests ajoutés

`src/__tests__/crmProduct.test.ts` (9 tests) : création produit physique avec prix/taxe/variantes, création service, refus en écriture pour readonly, lecture autorisée pour readonly, filtre par type, recherche par nom, désactivation (statut + disponibilité), filtre par disponibilité, **isolation stricte entre deux entreprises** (liste, détail, modification).

### Commandes exécutées / Résultats

```
npm run build                                 → OK
npx jest src/__tests__/crmProduct.test.ts     → 9/9 passants
npm test (suite complète)                     → 190/192 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : table `crm_products` créée sans erreur, création d'un produit testée en réel, données nettoyées ensuite.

### Bilan Phase 1 (CRM) — terminée

Les 5 briques de `ROADMAP_BACKEND.md` §6 sont livrées, testées et vérifiées en conditions réelles (PostgreSQL) :

| Brique | Modèles | Tests |
|---|---|---|
| Organisation/Tenant | `Company`, `User.companyId/companyRole` | 12 |
| Clients/Prospects/Contacts | `Customer`, `Contact` | 16 |
| Opportunités/Pipeline | `PipelineStage`, `Opportunity` | 15 |
| Tâches/Relances/Rendez-vous | `CrmTask` | 11 |
| Catalogue | `Product` | 9 |

Total : 63 tests CRM dédiés, isolation multi-entreprises vérifiée systématiquement à chaque brique (liste, détail, modification, actions spécifiques). Suite complète ModèlePro + Naatalix : **190/192 passants** (le seul échec restant est le test Cloudinary environnemental identifié dès l'audit Phase 0, pas une régression). Build TypeScript propre à chaque étape. Le parcours cible `Prospect -> Opportunité -> Client -> Prochaine action` fonctionne de bout en bout, et `Product` sert de socle prêt à l'emploi pour les lignes de devis de la Phase 2.

Aucune fonctionnalité ModèlePro n'a été supprimée, renommée ou cassée : tous les modèles Naatalix (`Company`, `Customer`, `Contact`, `PipelineStage`, `Opportunity`, `CrmTask`, `Product`) sont des tables neuves, jamais des extensions des tables marketplace couplées à `Artisan` (`Client`, `Appointment`, `Creation`).

### Prochaine étape

Phase 2 — ERP commercial (`ROADMAP_BACKEND.md` §7), à démarrer par les Devis : numérotation par entreprise, lignes basées sur `Product`, client/contact issus de `Customer`/`Contact`, statuts (brouillon/envoyé/accepté/refusé/expiré), conversion en commande sans ressaisie.

## 2026-09-22 - Phase 2 (ERP) début : Devis

### Objectif

Première brique ERP (`ROADMAP_BACKEND.md` §7.1) : devis numérotés par entreprise, lignes basées sur le catalogue `Product`, cycle de statuts complet.

### Fichiers ajoutés/modifiés

- `src/models/DocumentCounter.ts` (nouveau, table `crm_document_counters`) : compteur par `(companyId, prefix)`, index unique composite.
- `src/services/documentNumberingService.ts` (nouveau) : `nextDocumentNumber(companyId, prefix, transaction)` — verrou de ligne (`transaction.LOCK.UPDATE`) pour éviter une collision entre deux créations simultanées. Conçu pour être réutilisé tel quel par les commandes (`CMD`) et factures (`FAC`) à venir — au moins 3 usages prévus, ce qui justifie l'extraction en service partagé dès maintenant plutôt qu'après coup.
- `src/models/Quote.ts` (nouveau, table `crm_quotes`) et `src/models/QuoteLine.ts` (nouveau, table `crm_quote_lines`) : `numero`, `customerId`/`contactId`, `statut` (brouillon/envoye/accepte/refuse/expire), `dateValidite`, `sousTotal`/`totalTaxes`/`totalTTC`/`remiseGlobale` recalculés à chaque mutation de lignes (source unique d'écriture : `quoteController.recalculateQuoteTotals`). Les totaux de ligne (HT/TTC) ne sont jamais stockés, uniquement calculés à la volée (`computeLineTotals`) pour ne jamais diverger des champs bruts.
- `src/controllers/quoteController.ts`, ajouts dans `src/routes/crmRoutes.ts` : CRUD devis + lignes (verrouillés hors statut `brouillon`), transitions `send`/`accept`/`refuse`/`expire` validées par une machine à états stricte (`transition(allowedFrom, to)`).
- `src/app.ts`, `src/models/index.ts` : import/export des nouveaux modèles.

### Règles métier

- Un devis et ses lignes ne sont modifiables que tant que `statut = 'brouillon'` (400 explicite sinon) — une fois envoyé, il est figé jusqu'à la décision du client.
- Transitions autorisées uniquement : `brouillon → envoye`, puis `envoye → {accepte, refuse, expire}` ; toute autre transition est refusée (ex. `brouillon → accepte` direct, ou re-transition depuis un statut terminal).
- Envoyer un devis sans aucune ligne est refusé.
- Total de ligne = `quantité × prix unitaire × (1 - remise%)`, taxé ensuite par `tauxTaxe` (venant du produit par défaut, surchageable par ligne). `remiseGlobale` est une remise forfaitaire supplémentaire déduite du TTC final.
- Un `contactId` fourni doit appartenir au `customerId` du devis (pas n'importe quel contact de l'entreprise).
- Écriture réservée à `companyRole` ∈ {admin, manager, commercial} ; lecture ouverte à tout membre.

### Tests ajoutés

`src/__tests__/quote.test.ts` (14 tests) : création avec lignes/numérotation/totaux vérifiés au FCFA près, incrémentation du numéro, permission readonly bloquée, contact incohérent avec le client rejeté, ajout/modification de ligne avec recalcul des totaux, refus d'envoi sans ligne, transition `send`, verrouillage en modification une fois envoyé, refus de transition invalide, transition `accept` (terminale, un second `refuse` derrière est rejeté), filtre par statut, **isolation stricte entre deux entreprises** (numérotation qui repart à 0001 pour l'entreprise B, liste, détail, transition).

### Commandes exécutées / Résultats

```
npm run build                          → OK
npx jest src/__tests__/quote.test.ts   → 14/14 passants
npm test (suite complète)              → 204/206 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : tables `crm_document_counters`/`crm_quotes`/`crm_quote_lines` créées sans erreur (index uniques composites inclus), flux réel testé (création devis avec ligne → numéro `DEV-2026-0001` → envoi), données nettoyées ensuite.

### Limites connues / décisions restantes

- Pas encore de génération PDF pour le devis — volontairement différée : la roadmap traite la génération de documents (devis, facture, reçu, bon de commande/livraison, relevé client) comme un livrable transversal unique (§7.6 "Documents et exports"), pas une fonctionnalité à reconstruire à chaque type de document. Sera fait une fois les autres documents ERP modélisés, pour un seul service de rendu PDF partagé.
- Pas d'expiration automatique d'un devis dont `dateValidite` est dépassée (le passage à `expire` est manuel pour l'instant) — à brancher éventuellement sur le même mécanisme de job quotidien que celui déjà existant pour les abonnements artisan (`server.ts`).
- Pas de conversion devis → commande : la Commande commerciale Naatalix n'existe pas encore (prochaine étape). L'endpoint de conversion sera ajouté avec elle pour respecter le critère "sans ressaisie des lignes".

### Prochaine étape

`ROADMAP_BACKEND.md` §7.2 — Commandes commerciales Naatalix, avec conversion `Devis accepté → Commande` sans ressaisie des lignes (le critère principal de fin de cette étape).

## 2026-09-22 - Phase 2 (ERP) suite : Commandes commerciales

### Objectif

Deuxième brique ERP (`ROADMAP_BACKEND.md` §7.2) : commandes commerciales Naatalix avec conversion depuis un devis accepté, sans ressaisie des lignes.

### Décision d'architecture

Même choix que pour `Customer`/`CrmTask`/`Product` : le modèle `Order` ModèlePro (table `orders`) est couplé à `Artisan`/`Creation` (marketplace), donc **non touché**. Nouveau modèle Naatalix `SalesOrder` (table `crm_sales_orders`), nom de classe distinct pour éviter toute confusion/collision d'import avec `Order`. **Zéro régression possible sur `orders`** (critère explicite de la roadmap) puisqu'aucune ligne de code ModèlePro n'a été modifiée.

### Fichiers ajoutés/modifiés

- `src/models/SalesOrder.ts` (nouveau) et `src/models/SalesOrderLine.ts` (nouveau, table `crm_sales_order_lines`) : mêmes principes que `Quote`/`QuoteLine` (totaux de ligne calculés à la volée, totaux d'en-tête recalculés à chaque mutation). `historiqueStatuts` : trace légère des transitions (JSON en texte, spécifique à cette entité — pas un audit trail générique, toujours différé à l'entité `AuditLog`, Phase 5), répondant explicitement au "statut et historique" demandé par la roadmap.
- `src/controllers/salesOrderController.ts`, ajouts dans `src/routes/crmRoutes.ts` : CRUD commande + lignes (verrouillés hors `brouillon`, même règle que Quote), transitions `confirm`/`start-preparation`/`deliver`/`cancel` via machine à états stricte, et **`POST /crm/quotes/:id/convert-to-order`** — le critère principal de cette étape : copie intégrale des lignes du devis (produit, désignation, quantité, prix, remise, taxe) vers la nouvelle commande en une transaction, sans aucune ressaisie ; la commande démarre directement au statut `confirmee` (le client a déjà accepté le devis) plutôt qu'à `brouillon`.
- `src/app.ts`, `src/models/index.ts` : import/export des nouveaux modèles.
- Réutilisation telle quelle de `nextDocumentNumber` (déjà conçu pour ça) avec le préfixe `CMD`.

### Règles métier

- Cycle de statuts : `brouillon → confirmee → en_preparation → livree`, avec `annulee` accessible depuis `brouillon`/`confirmee`/`en_preparation`. `deliver` est aussi accepté directement depuis `confirmee` (toutes les commandes n'ont pas besoin d'une étape de préparation distincte, ex. prestation immédiate). Chaque transition est strictement validée : un statut terminal ou un raccourci non prévu est rejeté (400).
- Une commande issue d'une conversion de devis est verrouillée sur son `quoteId` : une seconde tentative de conversion du même devis est refusée (`SalesOrder.findOne({ where: { quoteId } })`).
- Seul un devis au statut `accepte` peut être converti.
- Lignes et en-tête modifiables uniquement tant que `statut = 'brouillon'`, identique à Quote.

### Tests ajoutés

`src/__tests__/salesOrder.test.ts` (13 tests) : création manuelle avec numérotation `CMD-YYYY-0001`, refus pour readonly, cycle complet confirmer→préparer→livrer, historique des statuts vérifié, transition invalide rejetée, modification bloquée hors brouillon, annulation, **conversion devis→commande avec vérification exacte des lignes et des totaux copiés (pas de ressaisie)**, refus de double conversion, refus de conversion d'un devis non accepté, filtre par statut, **isolation stricte entre deux entreprises** (numérotation indépendante, liste, détail, transition).

### Commandes exécutées / Résultats

```
npm run build                               → OK
npx jest src/__tests__/salesOrder.test.ts   → 13/13 passants
npm test (suite complète)                   → 217/219 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : tables `crm_sales_orders`/`crm_sales_order_lines` créées sans erreur, flux réel testé de bout en bout (devis → envoi → acceptation → conversion en commande `CMD-2026-0001`, lignes et historique corrects), données nettoyées ensuite.

### Limites connues / décisions restantes

- Pas de génération PDF (bon de commande) — même report assumé que pour les devis, vers le livrable transversal §7.6.
- Pas encore de lien vers facture (`SalesOrder.factureId`) — sera ajouté avec le module Facturation, prochaine étape.

### Prochaine étape

`ROADMAP_BACKEND.md` §7.3 — Facturation et règlements : factures numérotées (préfixe `FAC`, même service de numérotation), lignes, échéances, avoir simple, statuts payé/partiel/impayé, règlements manuels, lien vers `SalesOrder`.

## 2026-09-22 - Phase 2 (ERP) : Facturation et règlements — parcours ERP minimum bouclé

### Objectif

Troisième brique ERP (`ROADMAP_BACKEND.md` §7.3) : factures, avoirs, règlements manuels. Avec cette brique, le parcours ERP minimum de la roadmap (`Prospect -> Devis -> Commande -> Facture -> Paiement -> Reçu`) est complet.

### Décision d'architecture

Même choix que pour `Customer`/`CrmTask`/`Product`/`SalesOrder` : le `Payment` ModèlePro (paiements marketplace PayTech/Wave/Orange Money) n'est pas touché. Nouveau modèle `InvoicePayment` (table `crm_invoice_payments`) dédié aux règlements manuels Naatalix, conformément au principe du cahier des charges "Naatalix doit fonctionner sans PayTrack avec des règlements manuels" (§7, F-009).

### Fichiers ajoutés/modifiés

- `src/models/Invoice.ts` (table `crm_invoices`), `src/models/InvoiceLine.ts` (`crm_invoice_lines`), `src/models/InvoicePayment.ts` (`crm_invoice_payments`) — nouveaux.
  - Deux axes de statut orthogonaux sur `Invoice`, même principe qu'`Order.statut`/`Order.paymentStatus` déjà utilisé côté ModèlePro : `statut` (brouillon/envoyee/annulee, cycle du document) et `paymentStatus` (impayee/partiellement_payee/payee, dérivé automatiquement des règlements enregistrés).
  - `type` (facture/avoir) + `avoirDeFactureId` (auto-référence) pour l'avoir simple.
- `src/controllers/invoiceController.ts`, ajouts dans `src/routes/crmRoutes.ts` :
  - CRUD facture + lignes (verrouillés hors `brouillon`, même règle que Quote/SalesOrder).
  - `POST /crm/orders/:id/convert-to-invoice` — conversion commande → facture (statut `envoyee` directement, lignes copiées sans ressaisie), un seul essai par commande.
  - `POST /crm/invoices/:id/credit-note` — avoir simple, intégral par défaut (reprend les lignes de la facture d'origine) ou partiel si des lignes sont fournies explicitement.
  - `POST /crm/invoices/:id/payments` + `GET .../payments` — règlement manuel : rejette un montant qui dépasserait le solde restant, recalcule `montantPaye`/`soldeRestant`/`paymentStatus` (point d'écriture unique : `recalculateInvoicePayments`).
  - `PATCH /crm/invoices/:id/cancel` — refusé si un règlement a déjà été enregistré (utiliser un avoir à la place, pour ne jamais effacer une trace de paiement réel).
  - `GET /crm/customers/:customerId/statement` — relevé client (total facturé, total avoir, total payé, solde dû), sans PDF (voir limites).
- `src/app.ts`, `src/models/index.ts` : import/export. Réutilisation de `nextDocumentNumber` avec les préfixes `FAC` (facture) et `AV` (avoir).

### Règles métier

- Un règlement n'est acceptable que sur une facture `envoyee`, et seulement à hauteur du solde restant (rejet explicite au-delà, tolérance de 0,01 FCFA pour les arrondis flottants) — **c'est le critère principal de cette étape**, vérifié précisément dans les tests (paiement partiel → `partiellement_payee` avec solde exact, puis paiement du solde → `payee` avec solde à 0).
- Une facture réglée (même partiellement) ne peut plus être annulée — seul un avoir permet de corriger une facture déjà payée.
- L'avoir n'est jamais une facture négative : c'est un document `type='avoir'` à montant positif ; le relevé client le soustrait explicitement (`totalFacture - totalAvoir - totalPaye`).

### Tests ajoutés

`src/__tests__/invoice.test.ts` (15 tests) : création avec numérotation `FAC-YYYY-0001`, refus readonly, refus de règlement sur brouillon, envoi, **paiement partiel avec solde/statut exacts, puis paiement du solde (statut payée, solde 0) — critère principal vérifié**, refus d'un règlement dépassant le solde, historique des règlements, refus d'annulation d'une facture réglée, avoir simple intégral, conversion commande→facture sans ressaisie (lignes et totaux vérifiés), refus de refacturer la même commande, relevé client cohérent (facture + avoir + payé + solde dû), **isolation stricte entre deux entreprises** (numérotation FAC indépendante, liste, détail, règlement bloqué).

### Bug trouvé et corrigé pendant les tests

`createCreditNote` plantait (500) sur une requête sans corps (`req.body` `undefined` quand aucun JSON n'est envoyé, Express ne l'initialise pas à `{}` par défaut) — corrigé par une valeur de repli (`req.body || {}`). Détecté par le test de l'avoir par défaut (sans lignes explicites), corrigé avant validation finale.

### Commandes exécutées / Résultats

```
npm run build                             → OK
npx jest src/__tests__/invoice.test.ts    → 15/15 passants
npm test (suite complète)                 → 232/234 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : tables `crm_invoices`/`crm_invoice_lines`/`crm_invoice_payments` créées sans erreur, flux réel testé de bout en bout (facture → envoi → règlement intégral → statut `payee` → relevé client cohérent), données nettoyées ensuite.

### Bilan : parcours ERP minimum bouclé

`Prospect -> Devis -> Commande -> Facture -> Paiement` fonctionne intégralement de bout en bout, avec isolation stricte multi-entreprises vérifiée à chaque étage (Company, Customer/Contact, Opportunity/Pipeline, CrmTask, Product, Quote, SalesOrder, Invoice/InvoicePayment). Aucune table ModèlePro n'a été modifiée sur l'ensemble de la Phase 1 et de cette portion de la Phase 2.

### Limites connues / décisions restantes

- Pas de génération PDF ni de "reçu" imprimable — le paiement enregistré (`InvoicePayment`) constitue la donnée du reçu, son rendu PDF est différé au livrable transversal §7.6 avec les autres documents.
- Une commande ne peut être facturée qu'une seule fois (pas de facturation partielle/multiple d'une même commande) — limitation MVP assumée, à revisiter si le besoin se confirme.
- Pas d'échéance automatique relancée (notification de facture en retard) — à brancher plus tard sur le même mécanisme de job quotidien déjà utilisé pour les abonnements artisan.

### Prochaine étape

`ROADMAP_BACKEND.md` §7.4 — Fournisseurs et achats : fiches fournisseurs, produits fournis, commandes d'achat, échéances et historique.

## 2026-09-22 - Phase 2 (ERP) suite : Fournisseurs et achats

### Objectif

Quatrième brique ERP (`ROADMAP_BACKEND.md` §7.4) : fournisseurs, contacts fournisseurs, produits fournis (prix/conditions), commandes fournisseurs avec historique et soldes.

### Fichiers ajoutés/modifiés

- `src/models/Supplier.ts` (`crm_suppliers`), `SupplierContact.ts` (`crm_supplier_contacts`, même structure que `Contact` côté CRM), `SupplierProduct.ts` (`crm_supplier_products`, lien fournisseur↔`Product` avec `prixAchat`/`referenceFournisseur`/`delaiLivraison`, unique par paire) — nouveaux.
- `src/models/PurchaseOrder.ts` (`crm_purchase_orders`) et `PurchaseOrderLine.ts` (`crm_purchase_order_lines`) — même principe que `SalesOrder`/`SalesOrderLine` (deux axes `statut`/paiement, `historiqueStatuts` léger). `PurchaseOrderPayment.ts` (`crm_purchase_order_payments`) — règlements faits **au** fournisseur, miroir d'`InvoicePayment`.
- `src/controllers/supplierController.ts` (fournisseurs, contacts, produits fournis, relevé fournisseur) et `src/controllers/purchaseOrderController.ts` (commandes, lignes, transitions, règlements) — nouveaux.
- `src/routes/supplierRoutes.ts` (nouveau routeur, monté sur `/api/v1/crm` à côté de `crmRoutes`), `src/app.ts`, `src/models/index.ts` mis à jour.
- Réutilisation de `nextDocumentNumber` avec le préfixe `ACH`.

### Règles métier

- Écriture (fournisseurs, commandes, règlements) réservée à `companyRole` ∈ {admin, manager, **stock**} — différent du reste du CRM/ERP (commercial) car les achats/stocks relèvent naturellement du rôle stock défini par le cahier des charges (F-002). Lecture ouverte à tout membre.
- Cycle commande fournisseur : `brouillon → envoyee → confirmee → recue`, `annulee` accessible depuis les trois premiers ; `receive` accepté directement depuis `envoyee` ou `confirmee`.
- Un produit ne peut être associé qu'une seule fois par fournisseur (paire `supplierId`/`productId` unique) — une nouvelle tentative est rejetée avec l'id existant, pas une erreur muette.
- Même règle de règlement que Facturation : rejeté si le montant dépasse le solde restant.

### Tests ajoutés

`src/__tests__/supplier.test.ts` (13 tests) : création fournisseur (rôle stock autorisé, commercial refusé), contact fournisseur, association produit fourni avec prix/conditions, refus de doublon d'association, création commande avec numérotation `ACH-YYYY-0001`, cycle complet envoyer→confirmer→recevoir, **historique consultable (critère principal)**, règlement partiel avec recalcul du solde, refus de dépassement de solde, relevé fournisseur cohérent, **isolation stricte entre deux entreprises (critère principal)** : numérotation indépendante, liste, détail, règlement bloqué, liste des fournisseurs elle-même isolée.

### Commandes exécutées / Résultats

```
npm run build                             → OK
npx jest src/__tests__/supplier.test.ts   → 13/13 passants
npm test (suite complète)                 → 245/247 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : les 6 nouvelles tables créées sans erreur, flux réel testé (fournisseur → commande → envoi → relevé), données nettoyées ensuite.

### Limites connues / décisions restantes

- Pas de lien automatique entre une commande fournisseur reçue (`recue`) et une entrée de stock — c'est l'objet du prochain module (Stocks), qui viendra consommer cet événement.
- Pas de génération PDF (bon de commande fournisseur) — même report assumé qu'ailleurs, vers le livrable transversal §7.6.

### Prochaine étape

`ROADMAP_BACKEND.md` §7.5 — Stocks : stock par produit (et site si nécessaire), entrées/sorties/ajustements, seuils d'alerte, valorisation simple, lien avec achats (réception de commande fournisseur) et ventes (commande client livrée).

## 2026-09-22 - Phase 2 (ERP) fin : Stocks — Phase 2 ERP terminée

### Objectif

Cinquième et dernière brique de la Phase 2 (`ROADMAP_BACKEND.md` §7.5) : stock par produit et par site, mouvements (entrée/sortie/ajustement/inventaire), seuils d'alerte, valorisation simple, lien automatique avec les achats et les ventes.

### Fichiers ajoutés/modifiés

- `src/models/Site.ts` (`crm_sites`) — site/entrepôt ; un "Site principal" est créé automatiquement à l'inscription de l'entreprise (`crmSeedService.seedDefaultSite`, appelé dans `companyController.registerCompany`), pour que les mouvements automatiques aient toujours une cible sans configuration préalable.
- `src/models/StockItem.ts` (`crm_stock_items`) — niveau de stock courant par `(productId, siteId)`, `seuilAlerte`, `coutMoyenPondere` (coût moyen pondéré, pour la valorisation).
- `src/models/StockMovement.ts` (`crm_stock_movements`) — ledger append-only, `quantite` = delta signé réellement appliqué (positif = entrée, négatif = sortie), pour que la somme des mouvements d'un produit égale toujours sa quantité courante.
- `src/services/stockService.ts` (nouveau) : `applyStockMovement`, point d'écriture unique de tout le stock — verrouille la ligne `StockItem` (`transaction.LOCK.UPDATE`), **rejette toute sortie/ajustement qui ferait passer le stock sous zéro sauf `forcerStockNegatif` explicite** (`StockNegativeError`), met à jour le coût moyen pondéré sur les entrées à coût connu.
- `src/controllers/stockController.ts`, `src/routes/stockRoutes.ts` (nouveaux, montés sur `/api/v1/crm`) : CRUD sites, `POST/GET /crm/stock/movements` (entrée/sortie/ajustement manuels), `POST /crm/stock/inventaire` (delta calculé automatiquement à partir d'une quantité physique comptée), `GET /crm/stock` (niveaux + valorisation par ligne), `GET /crm/stock/alerts` (sous seuil), `GET /crm/stock/valuation` (Σ quantite × coutMoyenPondere), `PUT /crm/stock/:id/threshold`.
- **Lien avec les achats** : `purchaseOrderController.receivePurchaseOrder` (remplace l'ancienne transition générique) crée une entrée de stock par ligne rattachée à un produit, sur le site principal, avant de passer la commande à `recue`.
- **Lien avec les ventes** : `salesOrderController.deliverOrder` (remplace l'ancienne transition générique) crée une sortie de stock par ligne rattachée à un produit avant de passer la commande à `livree` — **toute la livraison échoue (transaction) si une seule ligne créerait un stock négatif**, sauf `forcerStockNegatif` explicite.
- `src/app.ts`, `src/models/index.ts` : import/export.

### Règles métier — critère principal

**Aucune sortie (ni ajustement à la baisse, ni inventaire à la baisse, ni livraison) ne peut créer un stock négatif**, sauf si `req.user.companyRole === 'admin'` **et** `forcerStockNegatif: true` explicitement passé dans la requête — vérifié dans `canForceNegative` (dupliqué à l'identique dans `stockController.ts` et `salesOrderController.ts`, une seule ligne de logique, pas besoin d'abstraction pour 2 usages). Une entrée n'est jamais bloquée (elle augmente toujours le stock).

### Tests ajoutés

`src/__tests__/stock.test.ts` (13 tests) : site principal auto-créé, entrée avec calcul du coût moyen pondéré, recalcul sur une deuxième entrée à coût différent, **refus d'une sortie qui créerait un stock négatif (critère principal)**, sortie acceptée dans la limite du stock, **refus qu'un rôle non-admin force un stock négatif**, **admin autorisé à le forcer explicitement**, inventaire avec delta calculé automatiquement, seuil d'alerte retrouvé dans `/stock/alerts`, valorisation simple correcte, historique des mouvements consultable, lien achats→stock (réception crée une entrée), **isolation stricte entre deux entreprises** (stock, sites, mouvement refusé sur un produit d'une autre entreprise).

### Tests existants adaptés

`src/__tests__/salesOrder.test.ts` : le test de cycle confirmer→préparer→livrer approvisionne désormais le produit en stock avant de livrer (sinon la livraison est à juste titre bloquée par le nouveau contrôle de stock négatif) — comportement correct et volontaire, pas une régression à corriger autrement.

### Commandes exécutées / Résultats

```
npm run build                          → OK
npx jest src/__tests__/stock.test.ts   → 13/13 passants
npm test (suite complète)              → 258/260 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : les 3 nouvelles tables créées sans erreur, flux réel testé (entrée de stock avec coût, sortie excessive rejetée en 400, valorisation correcte), données nettoyées ensuite.

### Limites connues / décisions restantes

- Un seul site par défaut ; le multi-site est possible (modèle déjà prêt) mais les mouvements automatiques (achats/ventes) ciblent toujours le site principal — pas de sélection de site à la livraison/réception pour l'instant.
- Pas de valorisation FIFO/LIFO, seulement le coût moyen pondéré (conforme à "valorisation simple" demandé par la roadmap).

### Bilan Phase 2 (ERP) — terminée

Les 5 briques de `ROADMAP_BACKEND.md` §7 sont livrées, testées et vérifiées en conditions réelles (PostgreSQL) : Devis, Commandes commerciales, Facturation et règlements, Fournisseurs et achats, Stocks. Le parcours ERP complet fonctionne de bout en bout : `Prospect → Devis → Commande → Facture → Paiement`, avec désormais le stock qui se met à jour automatiquement à la réception d'un achat et à la livraison d'une vente. Isolation stricte multi-entreprises vérifiée à chaque brique. Aucune table ModèlePro modifiée sur l'ensemble des Phases 1 et 2.

### Prochaine étape

`ROADMAP_BACKEND.md` §7.6 — Documents et exports : c'est ici, avec tous les documents ERP maintenant modélisés (devis, commande, facture, bon de commande fournisseur), que la génération PDF différée à chaque étape précédente sera traitée comme un service unique et partagé. À la suite, ou en parallèle selon la priorité produit : Phase 3 (Rentabilité et pilotage), qui peut aussi démarrer indépendamment puisque les données commerciales (ventes, achats, stocks) nécessaires à ses calculs existent désormais.

## 2026-09-22 - Phase 3 : Module Rentabilité et pilotage

### Décision

L'utilisateur a demandé de prioriser la Phase 3 (module Rentabilité, `Cahier_des_charges_Module_Naatalix_Rentabilite.docx`) avant le module Documents/PDF de la Phase 2, jugé plus important pour la valeur produit. Passage direct à la Phase 3.

### Objectif

Implémenter le cœur du simulateur de rentabilité : création de simulation, coûts fixes/variables, calcul du coût unitaire/bénéfice/marge, coût maximal/prix minimum/prix premium, seuil de rentabilité, objectif de bénéfice ("je veux gagner X"), scénarios prudent/réaliste/optimiste, analyse de sensibilité, simulation de remises, historique/duplication/comparaison — couvrant la quasi-totalité des niveaux P0 et P1 de la priorisation du cahier des charges (§43).

### Fichiers ajoutés

- `src/models/ProfitabilitySimulation.ts` (`crm_profitability_simulations`) : hypothèses (nature, prix marché, prix envisagé, quantité prévue, marge cible avec distinction explicite marge/marque, investissement initial) + résultats calculés mis en cache (coût unitaire, bénéfice, taux de marge/marque, coût maximal, prix plancher/recommandé/premium, seuil de rentabilité CA/volume, ROI, statut vert/orange/rouge).
- `src/models/ProfitabilityCost.ts` (`crm_profitability_costs`) : lignes de coût par simulation, catégorisées (achat/transport/paiement/marketing/RH-fiscal/autre), `type` fixe/variable. Convention retenue pour coller exactement à l'exemple chiffré du cahier des charges (§41) : un coût **variable** est saisi **par unité** (s'additionne directement au coût variable unitaire), un coût **fixe** est saisi en **total sur la période** (réparti ensuite sur `quantitePrevue`).
- `src/services/profitabilityCalculationService.ts` (nouveau) : moteur de calcul **pur** (aucune dépendance Sequelize/Express) — `computeResults`, `applyScenario`, `computeSensitivity`, `computeDiscountSimulation`, `computeTargetProfit`. Formules reproduites et vérifiées contre les exemples chiffrés exacts du cahier des charges (§11, §14, §13, §41, §42).
- `src/controllers/profitabilityController.ts`, `src/routes/profitabilityRoutes.ts` (montées sur `/api/v1/crm/profitability`) : CRUD simulation + coûts (toute mutation recalcule automatiquement via `recalculateSimulation`, point d'écriture unique), archivage/restauration, duplication, comparaison de simulations, et les 4 analyses à la demande (`target-profit`, `scenarios`, `sensitivity`, `discount-simulation`) qui ne persistent rien — elles recalculent à la volée sans modifier la simulation de référence.
- **Comparateur fournisseurs** (§28, `GET /profitability/supplier-comparison?productId=`) : ajouté à coût quasi nul en réutilisant `SupplierProduct` (module Fournisseurs, déjà en place) plutôt que de dupliquer une saisie de prix — trie par `prixAchat` et suggère le moins cher.
- `src/app.ts`, `src/models/index.ts` : import/export.

### Règles métier

- **Distinction marge/marque explicite** : `margeCibleType` ('marge' = bénéfice/coût, 'marque' = bénéfice/prix de vente) évite l'erreur de fixation des prix que le cahier des charges signale explicitement comme risque (§10.5). Les formules de coût maximal/prix minimum utilisent spécifiquement la convention "sur CA" (taux de marque), conformément à l'exemple chiffré du cahier des charges, indépendamment du type affiché à l'utilisateur pour le statut.
- **Statut de rentabilité** dérivé automatiquement (jamais saisi manuellement) : ROUGE si bénéfice unitaire ≤ 0, VERT si la marge cible est atteinte/dépassée, ORANGE sinon.
- **Aucun recalcul manuel requis** : toute mutation d'une hypothèse (prix, quantité, coût, marge cible) ou d'une ligne de coût déclenche automatiquement le recalcul de tous les indicateurs dépendants — règle explicite du cahier des charges (§38 : "toute modification d'une hypothèse doit entraîner le recalcul des indicateurs dépendants").
- Les analyses (scénarios, sensibilité, remises, objectif de bénéfice) ne modifient jamais la simulation de référence — uniquement des calculs à la demande, conformément à "les recommandations ne modifient jamais automatiquement les données financières" (§38).
- Écriture (création/modification/coûts) réservée à `companyRole` ∈ {admin, manager, finance, commercial} — mapping des profils du cahier des charges §4 (Dirigeant, Responsable financier, Responsable commercial) sur les rôles d'entreprise déjà en place plutôt que d'étendre l'énumération `companyRole` pour ce seul module. Lecture et analyses à la demande ouvertes à tout membre (y compris readonly), car non destructives.

### Tests ajoutés

- `src/__tests__/profitabilityCalculation.test.ts` (19 tests, **unitaires purs**, sans DB ni API — conforme à l'exigence explicite du cahier des charges §44 "Tests unitaires des formules financières et des arrondis") : les 3 exemples chiffrés exacts du cahier des charges (§41, §11.1, §11.2, §42), répartition des charges fixes, seuil de rentabilité CA/volume, les 3 statuts vert/orange/rouge, ROI, les 3 scénarios, sensibilité (prix et coût), simulation de remises, objectif de bénéfice (y compris le cas non atteignable).
- `src/__tests__/profitability.test.ts` (15 tests, API) : création avec coûts et vérification immédiate des résultats, permissions (readonly bloqué en écriture, autorisé en lecture), ajout/modification de coût avec recalcul vérifié, modification du prix, objectif de bénéfice, scénarios, sensibilité, remises, duplication, archivage/restauration, comparaison, comparateur fournisseurs, **isolation stricte entre deux entreprises**.

### Commandes exécutées / Résultats

```
npm run build                                       → OK
npx jest src/__tests__/profitabilityCalculation.test.ts → 19/19 passants
npx jest src/__tests__/profitability.test.ts             → 15/15 passants
npm test (suite complète)                            → 292/294 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : les 2 nouvelles tables créées sans erreur, flux réel testé (création simulation avec coûts → résultats corrects → scénarios), données nettoyées ensuite.

### Limites connues / décisions restantes (périmètre P2 du cahier des charges, volontairement différé)

- **Prévisionnel vs réel automatisé** (§24-25) : non implémenté. Nécessite une agrégation robuste des données ERP réelles (ventes `SalesOrderLine`/`InvoiceLine`, coûts `StockItem.coutMoyenPondere`) sur une période, avec une logique de rapprochement qui mérite sa propre conception dédiée plutôt qu'une implémentation hâtive greffée ici. `ProfitabilitySimulation.productId` existe déjà comme point d'ancrage pour ce futur rapprochement.
- **Assistant IA "Bizora/Naatalix Rentabilité"** (§20) : non implémenté — nécessiterait une intégration LLM réelle avec des recommandations chiffrées justifiées, hors du périmètre d'un module CRUD backend ; ne pas construire de stub qui simulerait un raisonnement sans réel moteur derrière.
- **ROI/trésorerie avancés** (BFR, trésorerie minimale, délai de récupération) : seul le ROI simple (`bénéfice généré / investissement`) est implémenté, conformément à la formule de base du cahier des charges. Les calculs de besoin en fonds de roulement et de trésorerie prévisionnelle ne le sont pas.
- **Export PDF/Excel/CSV du rapport de simulation** (§30) : différé au même livrable transversal "Documents et exports" que les autres documents ERP.
- **Score de rentabilité sur 100** (§19, optionnel selon le cahier des charges) : seul le statut vert/orange/rouge est implémenté ; le score composite (marge, couverture des charges, dépendance au volume, écart marché, sensibilité, seuil) n'est pas construit — sa pondération mérite d'être validée avec le métier avant de coder une formule arbitraire.
- Pas d'historique détaillé des modifications au niveau champ (audit trail) — comme pour les autres modules, différé à l'entité `AuditLog` (Phase 5) ; seule la duplication/archivage sert de "versioning" pour l'instant.

### Prochaine étape

À la discrétion du produit : `ROADMAP_BACKEND.md` §7.6 (Documents et exports / PDF, différé depuis Devis/Commandes/Factures/Achats) ou Phase 4 (Abonnements, PayTrack, back-office ATAABA), ou le Dashboard de pilotage (§8, indicateurs CA/ventes/pipeline/stock/rentabilité) qui peut maintenant agréger des données réelles de tous les modules déjà livrés.

## 2026-09-22 - Phase 2 : Documents et exports (§7.6)

### Objectif

Livrable transversal différé volontairement à chaque étape précédente (Devis, Commandes, Factures, Achats) une fois que tous les documents ERP étaient modélisés : génération PDF (devis, bon de commande, bon de livraison, facture/avoir, reçu, bon de commande fournisseur, relevé client) avec identité de l'entreprise injectée, + export CSV/Excel sur les principales listes.

### Fichiers ajoutés

- `src/models/Company.ts` : ajout de `coordonneesPaiement` et `mentionsCommerciales` (TEXT) — complète l'identité documentaire du cahier des charges §12 (logo/nom/adresse/téléphone/email/NINEA/RCCM déjà présents depuis le module Company/Tenant). `companyController.updateMyCompany` et `server.ts` (migrations `companies.coordonnees_paiement`/`companies.mentions_commerciales`) mis à jour en conséquence.
- **`npm install pdfkit`** (+ `@types/pdfkit`) : bibliothèque JS pure, aucun binaire natif (contrairement à Puppeteer/Chromium), adaptée à un rendu programmatique de documents structurés. Vérifié : aucune vulnérabilité npm supplémentaire introduite (audit avant/après identique, 13 préexistantes côté dépendances tierces).
- `src/services/pdfService.ts` (nouveau) : primitives de dessin partagées (en-tête avec logo + identité entreprise, bloc destinataire, tableau de lignes, bloc totaux, pied de page avec mentions commerciales/coordonnées de paiement) — le logo (URL Cloudinary) est téléchargé en mémoire avec **échec silencieux** : un logo indisponible ne doit jamais empêcher la génération du document (vérifié par test avec une URL injoignable).
- `src/services/documentPdfGenerators.ts` (nouveau) : un générateur par type de document, construit sur les primitives ci-dessus — `generateQuotePdf`, `generateSalesOrderPdf` (mode commande/livraison), `generateInvoicePdf` (facture ou avoir selon `Invoice.type`), `generateReceiptPdf`, `generatePurchaseOrderPdf`, `generateCustomerStatementPdf`.
- `src/services/csvExportService.ts` (nouveau) : `toCsv`/`sendCsv` génériques — CSV avec BOM UTF-8 (accents corrects à l'ouverture dans Excel) ; pas de génération `.xlsx` native (voir limites).
- Endpoints PDF ajoutés dans `quoteController.ts` (`getQuotePdf`), `salesOrderController.ts` (`getOrderPdf`, `getDeliveryNotePdf` — refusé tant que la commande est en `brouillon`), `invoiceController.ts` (`getInvoicePdf`, `getPaymentReceiptPdf`, `getCustomerStatementPdf` — la logique d'agrégation du relevé a été extraite en `computeCustomerStatement` partagée avec l'endpoint JSON existant), `purchaseOrderController.ts` (`getPurchaseOrderPdf`).
- Endpoints CSV ajoutés (`exportX`) dans `crmCustomerController.ts`, `crmProductController.ts`, `quoteController.ts`, `salesOrderController.ts`, `invoiceController.ts`, `supplierController.ts`, `purchaseOrderController.ts`, `stockController.ts` — routes `/export` déclarées avant les routes `/:id` correspondantes pour éviter toute capture accidentelle par un paramètre.

### Règles métier

- **Identité et permissions respectées** (critère principal) : chaque PDF/export interroge d'abord la ressource avec le même filtre `companyId` que son endpoint JSON équivalent — un id d'une autre entreprise retourne 404 sans jamais générer de document (vérifié explicitement par test sur les 4 types de documents + les 8 exports CSV).
- Le bon de livraison n'est disponible qu'à partir du statut `confirmee` d'une commande (pas de bon de livraison pour un brouillon).
- Le service PDF ne gère pas la pagination multi-page (limite MVP assumée — documents courts en pratique ; un devis/facture à 40 lignes déborderait sur une seule page).

### Tests ajoutés

- `src/__tests__/documentPdf.test.ts` (10 tests) : génération de chaque type de PDF (devis, bon de commande, bon de livraison bloqué puis autorisé, facture, reçu, relevé client, bon de commande fournisseur) avec vérification de la signature binaire `%PDF-`, **logo injoignable géré sans erreur**, **isolation stricte** (404 sur les 4 types principaux pour une autre entreprise).
- `src/__tests__/csvExport.test.ts` (10 tests) : les 8 exports CSV vérifiés (content-type, `Content-Disposition: attachment`, BOM UTF-8, contenu attendu présent), isolation stricte (export vide pour une autre entreprise), 401 sans authentification.

### Commandes exécutées / Résultats

```
npm install pdfkit @types/pdfkit          → OK, 0 vulnérabilité supplémentaire
npm run build                              → OK
npx jest src/__tests__/documentPdf.test.ts → 10/10 passants
npx jest src/__tests__/csvExport.test.ts   → 10/10 passants
npm test (suite complète)                  → 312/314 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : migration des nouveaux champs `Company` appliquée sans erreur, PDF réel généré et vérifié (`%PDF-1.3`, 1938 octets) via `curl` avec écriture sur disque, export CSV réel vérifié (BOM + en-têtes + données correctes), données nettoyées ensuite.

### Limites connues / décisions restantes

- **Pas de génération `.xlsx` native** (seul CSV, qui s'ouvre nativement dans Excel/LibreOffice avec les bonnes colonnes) — ajouter une dépendance comme `exceljs` reste possible si un besoin réel de fichier Excel natif (feuilles multiples, mise en forme) se confirme.
- **Pas de pagination multi-page** dans les PDF — un document avec beaucoup de lignes déborderait de la page. Acceptable pour le volume typique d'une TPE/PME, à revisiter si le besoin se confirme.
- Le rendu PDF est volontairement sobre (pas de mise en page avancée, pas de choix de thème) — priorité donnée à l'exactitude des données injectées (identité, lignes, totaux) plutôt qu'au design, cohérent avec le principe "aucune fonctionnalité n'est considérée terminée uniquement parce qu'elle compile" du cahier des charges : ici, le test vérifie un vrai PDF valide, pas juste un code 200.

### Prochaine étape

À la discrétion du produit : Phase 4 (Abonnements SaaS, PayTrack, back-office ATAABA) ou le Dashboard de pilotage (§8), qui peut maintenant agréger les données réelles de tous les modules CRM/ERP/Rentabilité/Documents livrés.

## 2026-09-22 - Dashboard de pilotage (§8 roadmap, cahier des charges §11)

### Décision

L'utilisateur a choisi le Dashboard plutôt que la Phase 4 comme prochaine étape (après avoir confirmé le choix CSV vs .xlsx natif — CSV conservé, `exceljs` non ajouté faute de besoin exprimé : feuilles multiples/mise en forme/formules).

### Objectif

Un point d'entrée unique agrégeant les indicateurs des 6 domaines du cahier des charges §11 (Commercial, Finance opérationnelle, Produits/Services, Stocks, Fournisseurs, Équipe commerciale), avec le critère principal explicite : indicateurs filtrables par période et cohérents avec les transactions réelles.

### Fichiers ajoutés

- `src/controllers/dashboardController.ts`, `src/routes/dashboardRoutes.ts` (nouveau, monté sur `/api/v1/crm/dashboard`) : `GET /crm/dashboard?from=&to=`.
- Un objet de réponse structuré en 6 sections, calculées par 6 fonctions dédiées (`buildCommercialIndicators`, `buildFinanceIndicators`, `buildProductIndicators`, `buildStockIndicators`, `buildSupplierIndicators`, `buildTeamIndicators`) — même approche "requête filtrée par companyId puis agrégation en JS" que `getForecast`/`getSupplierStatement`/`getCustomerStatement` déjà en place, plutôt que des `GROUP BY` SQL complexes à maintenir identiques entre SQLite (tests) et PostgreSQL (prod).

### Règles métier

- **Deux catégories d'indicateurs, volontairement traitées différemment** :
  - Les indicateurs de **flux** (CA, ventes, facturé, encaissé, achats, mouvements de stock, top produits...) respectent le filtre `from`/`to` (défaut : début du mois courant → maintenant).
  - Les indicateurs d'**état courant** (pipeline ouvert, stock disponible/alertes/ruptures, commandes fournisseur en cours, créances totales) sont indépendants de la période — ce sont des photos instantanées, pas des flux sur un intervalle (vérifié explicitement par test : un `from`/`to` dans le passé retourne bien `nombreVentes: 0` mais `stocks.quantiteTotale` reste inchangé).
  - CA jour/mois/année (cahier des charges §11) calculés systématiquement en plus du filtre générique, pour répondre exactement à l'indicateur demandé.
- `tauxConversionPct` = clients convertis dans la période (`convertedAt`) / clients créés dans la période (`createdAt`) — définition documentée en commentaire pour éviter toute ambiguïté future.
- Chaque section reste strictement scopée par `companyId`, jamais de fuite entre entreprises (vérifié pour les 6 domaines).

### Tests ajoutés

`src/__tests__/dashboard.test.ts` (9 tests) : scénario complet couvrant les 6 domaines avec des montants exacts vérifiés (CA, panier moyen, taux de conversion, pipeline pondéré, facturé/encaissé/créances, top produits/catégorie/produits peu actifs, quantité/valeur/alertes de stock, achats/commandes en cours/principal fournisseur, opportunités/tâches par commercial), filtrage par période (flux à zéro sur un intervalle vide, état courant préservé), **isolation stricte entre deux entreprises sur les 6 domaines simultanément**, 401 sans authentification.

### Commandes exécutées / Résultats

```
npm run build                          → OK
npx jest src/__tests__/dashboard.test.ts → 9/9 passants (tous les montants exacts du premier coup)
npm test (suite complète)              → 321/323 passants, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`) : dashboard vide puis avec une opportunité réelle, valeurs `Op.between`/agrégations JS cohérentes en environnement Postgres réel, données nettoyées ensuite.

### Limites connues / décisions restantes

- Pas de mise en cache des agrégats — chaque appel recalcule à la volée. Acceptable pour le volume actuel (TPE/PME) ; à revisiter avec un cache/matérialisation si le nombre de transactions grossit significativement (NFR-01 performance).
- `ventesParCommercial` utilise `Invoice.createdByUserId` (qui a converti/créé la facture) comme proxy du "commercial", faute d'un champ dédié "commercial responsable" sur `SalesOrder`/`Invoice` — cohérent avec `Opportunity.assignedToUserId` déjà utilisé ailleurs, mais à affiner si le produit veut distinguer explicitement créateur et commercial responsable.

### Prochaine étape

Phase 4 — Abonnements SaaS, intégration PayTrack, back-office ATAABA (dernière brique fonctionnelle majeure avant durcissement Phase 5).

## 2026-09-23 - Phase 4 : Abonnements SaaS, back-office ATAABA, PayTrack, support

### Vérification préalable : exports CSV

Les 8 exports CSV (`/crm/{customers,products,quotes,orders,invoices,suppliers,purchase-orders,stock}/export`) avaient été codés sans test ni journal. Ajout de `csvExport.test.ts` (11 tests : BOM UTF-8, échappement guillemets/point-virgule, accents, isolation, 401). Route `/export` bien déclarée avant `/:id`.

### Faille corrigée (pré-existante, non détectée à l'audit Phase 0)

`authController.register` lisait `role` depuis le corps et **créait le `User` avant** de valider le rôle : `POST /auth/register {role:"admin"}` renvoyait 400 mais laissait un compte admin ModèlePro utilisable. Avec l'arrivée du rôle `ataaba_staff`, cela aurait permis de s'auto-créer du personnel ATAABA. Le rôle est maintenant validé en amont (client|artisan uniquement) ; test dédié vérifiant qu'aucune ligne n'est créée. **À signaler : ModèlePro en production a pu être exposé à cette faille — vérifier la table `users` pour des comptes `admin` inattendus.**

### 4.1 Back-office ATAABA (cahier §14, F-019, F-020)

- `User.role = 'ataaba_staff'` + `User.platformRole` (superadmin | support | readonly), jamais rattaché à une `Company`. Aucune route publique de création : premier superadmin via `STAFF_TELEPHONE=… STAFF_PASSWORD=… npm run staff:create` (mot de passe ≥ 10 caractères), les suivants via `POST /backoffice/staff`.
- `platformMiddleware.requirePlatformStaff` : realm cross-entreprises **revalidé en base à chaque requête** (compte existant, actif, rôle courant) — suspendre un staff coupe son accès immédiatement même avec un JWT encore valide (testé).
- `AuditLog` (entité du cahier, jusque-là différée) + `auditService.recordAudit` (ne lève jamais). Journalise : création/suspension de staff, consultation d'une fiche entreprise/membres, suspension/réactivation, changement de plan, renouvellement, prolongation d'essai, gestion des plans, tickets, webhooks PayTrack. Consultable par superadmin uniquement.
- Endpoints `/api/v1/backoffice/*` : entreprises (liste filtrable, détail), stats globales (nb entreprises, abonnements par statut, MRR estimé), plans, abonnements, audit-logs. Le détail entreprise ne renvoie que des **compteurs d'usage**, jamais le contenu des données métier (§14). Impersonation volontairement non implémentée.

### 4.2 Abonnements SaaS (cahier §13, F-018)

- Modèles distincts du `Pack` artisan ModèlePro : `SubscriptionPlan`, `CompanySubscription` (1 par entreprise), `SubscriptionEvent` (historique append-only).
- **Plans par défaut = valeurs PROVISOIRES** (starter 3 users/1 site, pro 10/3, business illimité ; prix 10 000/25 000/60 000 FCFA/mois) à valider par la direction, modifiables depuis le back-office. Toute entreprise créée démarre en **essai 14 jours sur le plan pro**.
- `enforceSubscription` : entreprise suspendue/expirée/annulée = **lecture, PDF, exports, dashboard conservés ; toute écriture bloquée (402 `SUBSCRIPTION_INACTIVE`)**. Un essai ou une période échus sont traités comme expirés sans attendre le job. Sans abonnement (entreprises antérieures) : non bloqué, et `bootstrapSaas()` leur crée un essai au démarrage. Le support (tickets) n'est **pas** bloqué pour permettre la régularisation.
- Quotas (utilisateurs, sites) : 403 `QUOTA_EXCEEDED` ; un changement de plan est refusé si l'entreprise dépasserait le nouveau quota.
- `runSubscriptionMaintenance()` (job quotidien, `server.ts`) : expiration + notification des admins, alerte J-3 une seule fois par période (testé sans dépendre de l'horloge).
- Renouvellement/prolongation d'essai/suspension/réactivation par le superadmin ; `renewSubscription` est le point d'écriture unique (réutilisable par un futur paiement d'abonnement).

### 4.3 PayTrack (cahier §7, F-010, C1, C2)

- Naatalix fonctionne **sans** PayTrack (règlements manuels intacts, testé). Activation par entreprise (`Company.paytrackActif`, admin) + configuration plateforme (`PAYTRACK_API_URL`, `PAYTRACK_API_KEY`, `PAYTRACK_WEBHOOK_SECRET`) ; sinon 403 `PAYTRACK_DISABLED` / 503 `PAYTRACK_NOT_CONFIGURED`.
- `POST /crm/invoices/:id/paytrack/pay` → `PaytrackTransaction` (référence interne unique `NTX-…`) + appel `paytrackService.createPaymentRequest`.
- `POST /integrations/paytrack/webhook` (public) : signature HMAC-SHA256 sur le **corps brut** (`rawBody` capturé dans `app.ts`), **idempotent** (`PaytrackEvent.eventId` unique, traitement + journal dans une même transaction, course entre deux livraisons simultanées testée), seconde barrière sur le statut de la transaction. Montant/devise incohérents, référence inconnue, facture non payable → **anomalie journalisée, aucun règlement appliqué, réponse 200** (pas de relance infinie) ; visible du support (`/backoffice/integrations/paytrack/events|transactions`).
- **⚠ Le contrat PayTrack est SUPPOSÉ** (URL `POST /payments`, Bearer, champs `reference/amount/currency`, réponse `id/payment_url`, événements `payment.succeeded|failed`, en-tête `x-paytrack-signature`). Tout est isolé dans `paytrackService.ts` + le mapping de `handleWebhook`. **Non vérifié contre la vraie API** : aucun test en conditions réelles possible sans documentation/sandbox PayTrack. Les tests mockent `fetch` mais envoient de vrais webhooks signés à l'API.

### 4.4 Support et incidents (cahier §14)

`SupportTicket`/`SupportTicketMessage` : tickets ouverts par tout membre d'entreprise, traités par support/superadmin (statut, priorité, assignation, notes internes invisibles côté entreprise, notification à l'auteur). Isolation entre entreprises testée.

### Tests / résultats

```
backoffice.test.ts 21/21 · paytrack.test.ts 20/20 · support.test.ts 9/9 · csvExport.test.ts 11/11
npm run build → OK
npm test (suite complète, exécutée sans modification concurrente) → 372/374, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Réel PostgreSQL : démarrage OK (migrations `platform_role`, enum `ataaba_staff`, `paytrack_actif`), plans seedés, `npm run staff:create` + login staff + `/backoffice/stats` + `/backoffice/plans` OK, `register {role:admin}` → 400. Données de test nettoyées.

Incident de méthode noté : un premier run complet a échoué (timeout de `beforeAll` à 5 s) parce que j'avais lancé un build et modifié des fichiers pendant son exécution ; le test passait isolément. Timeout explicite ajouté ; le run propre suivant est vert.

### Limites connues

- Contrat PayTrack non validé (voir ci-dessus). Paiement de l'**abonnement Naatalix lui-même** via PayTrack non implémenté (renouvellement manuel par le superadmin pour l'instant).
- Pas de limitation de débit sur le webhook public ni sur `/auth/login` (Phase 5). Pas de 2FA pour le staff (SEC-03, Phase 5) — recommandé avant mise en production vu le pouvoir cross-entreprises du superadmin.
- Pas d'impersonation, pas de facturation/prorata lors d'un changement de plan.
- JWT staff valable 7 jours comme les autres (revalidation en base compense la révocation, pas la durée).
- Aucun commit Git n'a été créé : tout le travail Naatalix est non commité sur `naatalix-dev`.

### Questions transmises à la direction ATAABA — réponse reçue le 2026-09-23

**Abonnements** — tarifs et quotas retenus par la direction (remplacent les valeurs provisoires ci-dessus) :

| Formule | Prix/mois | Sites | Utilisateurs | Périmètre |
|---|---|---|---|---|
| Essentiel | 5 000 FCFA | 1 | 2 | Gestion commerciale de base (CRM + devis/commandes/factures) |
| Pro | 10 000 FCFA | 3 | 5 | + stock, rentabilité, reporting |
| Business | 20 000 FCFA | 10 | 15 | + multisite, consolidation, reporting avancé |
| Entreprise | Sur devis | Illimité | Illimité | Négocié au cas par cas |

**PayTrack** — décision de la direction : **Naatalix doit fonctionner de façon totalement autonome**. Un système de gestion et de suivi des paiements propre à Naatalix doit être développé, adapté à sa gestion commerciale. Naatalix ne doit **pas** dépendre de PayTrack, qui reste un produit séparé avec son propre positionnement. L'architecture doit seulement permettre, plus tard, une interconnexion optionnelle si elle apporte une réelle valeur ajoutée.

### Travail réalisé suite à cette décision

**Formules réelles** (`subscriptionService.ts`) : les 4 plans ci-dessus remplacent les valeurs provisoires. Ajout d'un système de **fonctionnalités par palier** (`SubscriptionPlan.features`, JSON) pour distinguer "gestion commerciale de base" (jamais gatée — CRM, devis, commandes, factures, disponible dès l'Essentiel) de "stock / fournisseurs / rentabilité / dashboard" (réservés à Pro et plus, via un nouveau middleware `requireFeature`). Le découpage Essentiel/Pro/Business↔modules est une **proposition de correspondance** avec les modules déjà construits (le mail de la direction laisse la porte ouverte à une structuration alternative) ; prix annuel = mensuel × 10 (convention "2 mois offerts", non fixée par la direction) — l'un et l'autre ajustables depuis le back-office sans redéploiement. Le plan "Entreprise" est seedé avec un prix à 0 ("sur devis") : aucune facturation automatisée n'existe pour l'ajuster par client, à faire manuellement depuis le back-office en attendant.

**PayTrack repositionné** : l'intégration construite plus tôt satisfaisait déjà la contrainte d'autonomie (désactivée par défaut, Naatalix fonctionne intégralement sans elle, tests dédiés) — aucune reprise de code nécessaire, seulement la confirmation que l'architecture reste conforme à la décision.

**Système natif de suivi des paiements** (`paymentReminderService.ts`, nouveau) : en plus des règlements manuels et indicateurs déjà en place (relevé client, dashboard finance), ajout de relances automatiques quotidiennes sur les factures non soldées — rappel à J-3 avant échéance, alerte le jour du retard, chacune envoyée une seule fois (`Invoice.rappelEcheanceEnvoye`/`alerteRetardEnvoyee`), aux utilisateurs `admin`/`finance` de l'entreprise concernée. Répond explicitement à la demande de la direction de disposer d'un suivi des paiements propre à Naatalix, indépendant de tout prestataire externe.

### Bug structurel découvert et corrigé pendant l'implémentation du filtrage par formule

`crmRoutes`, `supplierRoutes` et `stockRoutes` sont montés sur le **même préfixe** `/api/v1/crm`. Express essaie chaque routeur dans l'ordre de montage ; un `router.use(...)` sans chemin s'exécute pour **toute** requête qui atteint ce routeur, y compris celles destinées à un routeur monté après lui. Résultat : le contrôle `requireFeature('fournisseurs')` de `supplierRoutes` (monté avant `stockRoutes`) bloquait à tort des routes comme `/crm/sites` ou `/crm/stock/*`, qui auraient dû être contrôlées par `requireFeature('stock')`. Le même risque existait pour `/crm/profitability/*` et `/crm/dashboard`, protégés par un préfixe plus spécifique mais tout de même atteignables via ce fallthrough.

Ce bug était **invisible dans tous les tests précédents** : tant qu'un plan a soit toutes les fonctionnalités (essai), soit aucune (Essentiel), bloquer-sur-la-mauvaise-clé et bloquer-sur-la-bonne-clé produisent le même résultat observable. Il n'a été détecté qu'en testant un plan asymétrique (une seule fonctionnalité) — exactement le scénario que la nouvelle structure à 4 formules introduit réellement en production.

**Correctif** : dans `supplierRoutes.ts` et `stockRoutes.ts`, le contrôle (`protect, requireCompany, enforceSubscription, requireFeature(...)`) n'est plus posé via `router.use()` global mais répété explicitely sur **chaque route** (`...gate` en tête de chaque `router.get/post/put/patch/delete`) — un middleware attaché à une route précise ne s'exécute que si cette route correspond réellement, il n'y a donc plus de fallthrough incorrect vers un autre routeur. `crmRoutes.ts`, `profitabilityRoutes.ts` et `dashboardRoutes.ts` n'avaient pas ce problème (le premier ne fait aucun contrôle par fonctionnalité ; les deux autres sont montés sur des préfixes plus spécifiques que rien ne précède).

Nouveaux tests de verrouillage (`planFeatures.test.ts`, 5 tests) : un plan doté d'une seule fonctionnalité à la fois (stock / fournisseurs / rentabilité / dashboard) donne accès exactement à ce module et refuse les trois autres — reproduit précisément le scénario qui avait révélé le bug.

### Tests / résultats (suite à ces changements)

```
planFeatures.test.ts 10/10 (dont 5 nouveaux verrous anti-régression) · paymentReminder.test.ts 5/5
npm run build → OK
npm test (suite complète) → 387/389, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
```

Vérifié aussi en conditions réelles contre PostgreSQL (`modelpro_dev`, après purge des anciennes lignes `saas_plans`/`saas_subscriptions` issues des tests précédents) : les 4 formules re-seedées avec les valeurs exactes de la direction, `GET /crm/stock` refusé (403 `FEATURE_NOT_IN_PLAN`) et `GET /crm/customers` toujours accessible (200) pour une entreprise passée en Essentiel. Données nettoyées ensuite.

### Prochaine étape

Documents/Export PDF (§7.6, toujours différé), ou Phase 5 (2FA staff, rate limiting, doc OpenAPI, CI/CD) — au choix. Aucun commit Git effectué sur l'ensemble de la Phase 4 ; à faire quand l'utilisateur le demande explicitement.

## 2026-09-24 — Reconciliation des formules d'abonnement avec le cahier détaillé (NAATALIX_Formules_Fonctionnalites.docx)

- Objectif : le 2026-09-23, la direction avait communiqué par e-mail les tarifs/quotas des 4 formules et une décision d'autonomie vis-à-vis de PayTrack — implémentés le jour même avec un découpage de fonctionnalités grossier (Stock/Fournisseurs/Rentabilité/Dashboard entièrement réservés au Pro+). Le 2026-09-24, l'utilisateur a ajouté un nouveau document, `NAATALIX_Formules_Fonctionnalites.docx`, une matrice détaillée fonctionnalité-par-formule qui contredit ce découpage sur plusieurs points. Objectif de cette session : lire ce document (extraction texte via unzip + strip XML, la même technique que pour les autres cahiers .docx) et reconcilier le code avec.

- Écarts identifiés entre l'implémentation du 2026-09-23 et le nouveau cahier :
  - Quotas de sites : Pro 3→2, Business 10→5 (utilisateurs et prix inchangés).
  - Stock, Fournisseurs & achats, Inventaire, et un Dashboard/Rentabilité "basique" sont cochés dès l'Essentiel dans le nouveau cahier — alors qu'ils étaient entièrement bloqués pour l'Essentiel dans l'implémentation précédente (et verrouillés par toute une suite de tests de non-régression).
  - La matrice introduit une quinzaine de fonctionnalités plus fines (CRM & pipeline, opportunités, prévision CA, variantes produits, avoirs, seuils/alertes stock, valorisation stock, rendez-vous/agenda, dashboard avancé, consolidation multisite, journal d'activité, reporting par site/utilisateur...) au lieu des 4 clés grossières précédentes.
  - Export : le cahier indique "Excel/PDF" pour Pro/Business — contredit la décision antérieure de l'utilisateur de ne pas utiliser `.xlsx`.
  - Relances clients tiérées Manuelles/Assistées/Automatisées — le job de relance construit le 2026-09-23 tournait identiquement pour toutes les entreprises.
  - Le nouveau cahier ne détaille que 3 formules "de lancement" (Essentiel/Pro/Business), sans mentionner la formule "Entreprise sur devis" de l'e-mail du 2026-09-23.

- Décisions arbitrées avec l'utilisateur (AskUserQuestion) avant implémentation :
  1. Export : conserver le CSV pour toutes les formules (pas d'ajout d'`exceljs`) — le CSV s'ouvre nativement dans Excel, considéré comme satisfaisant "Excel/PDF" sans nouvelle dépendance.
  2. La formule "Entreprise (sur devis)" est conservée comme 4ᵉ palier, superset de Business, quotas illimités — le nouveau cahier détaille seulement les formules de lancement, il ne supprime pas explicitement ce palier.

- Interprétations faites sans nouvelle question (documentées ici pour traçabilité) :
  - "Rendez-vous & prestations" et "Agenda/réservations" du cahier correspondent au même sous-système que "CRM & pipeline commercial" côté code (`CrmTask`, `Opportunity`, `PipelineStage` — un seul modèle `CrmTask.type` couvre tâche/rappel/rendez-vous). Regroupés sous une seule clé `crm_pipeline` plutôt que 4 clés sans différence fonctionnelle réelle.
  - Relances "Assistées" (Pro) vs "Automatisées" (Business) : en l'absence de canal sortant vers le client (e-mail/SMS non construits — voir limites ci-dessous), les deux se traduisent aujourd'hui par la même alerte interne au service Finance. Une seule clé `relances_assistees` active/désactive le job pour l'entreprise (absent chez Essentiel = suivi manuel, conforme au cahier).
  - "Tableau de bord CA/ventes" (Essentiel) vs "Tableau de bord avancé" (Pro+) : le dashboard reste un seul endpoint, mais les sections produits/stocks/fournisseurs (et pipeline) sont désormais calculées et renvoyées uniquement si le plan a la fonctionnalité correspondante (`null` sinon) plutôt que 403 sur l'endpoint entier — l'Essentiel voit ses indicateurs commerciaux/finance de base.
  - "Analyse de rentabilité" Basique (Essentiel) / Avancée (Pro+) : le CRUD de simulations et de coûts reste ouvert à tous ; comparaison, scénarios, sensibilité, simulation de remise et objectif de profit passent derrière `rentabilite_avancee`.
  - "Variantes produits" (Pro+) : gate au niveau du champ `variantes` dans `createProduct`/`updateProduct` (403 seulement si le champ est fourni sans la fonctionnalité), pas de la route entière — le catalogue de base reste accessible dès l'Essentiel.

- Fichiers modifiés :
  - `src/services/subscriptionService.ts` — nouveau `PLAN_FEATURE_KEYS` (crm_pipeline, variantes_produits, avoirs, stock_alertes, stock_valorisation, dashboard_avance, rentabilite_avancee, relances_assistees, reporting_utilisateur), nouveaux quotas de sites Pro/Business, `TRIAL_PLAN_CODE` passé de `'pro'` à `'business'` (accès complet pendant l'essai, y compris le reporting par utilisateur).
  - `src/routes/stockRoutes.ts`, `src/routes/supplierRoutes.ts` — routes de base dégatées (disponibles dès l'Essentiel) ; seules `/stock/alerts`, `/stock/valuation` et `/stock/:id/threshold` restent gatées (`stock_alertes`/`stock_valorisation`). Toujours en gate par-route (pas `router.use()`) — voir le bug de fallthrough documenté dans la section précédente, qui s'applique toujours puisque ces routeurs restent co-montés sur `/api/v1/crm`.
  - `src/routes/crmRoutes.ts` — ajout d'un gate `crm_pipeline` sur pipeline-stages/opportunities(+forecast)/tasks, et `avoirs` sur `POST /invoices/:id/credit-note`, en gate par-route pour la même raison.
  - `src/routes/profitabilityRoutes.ts` — le `router.use()` global (sûr ici, préfixe dédié `/crm/profitability`) ne bloque plus rien par fonctionnalité ; `rentabilite_avancee` posé individuellement sur compare/supplier-comparison/target-profit/scenarios/sensitivity/discount-simulation.
  - `src/routes/dashboardRoutes.ts` — suppression du gate `requireFeature` sur la route ; le filtrage se fait désormais dans le contrôleur.
  - `src/controllers/dashboardController.ts` — `getDashboard` calcule `dashboard_avance`/`crm_pipeline`/`reporting_utilisateur` via `hasFeature()` et renvoie `null` pour les sections non incluses (produits/stocks/fournisseurs/equipeCommerciale) plutôt que de bloquer toute la route.
  - `src/controllers/crmProductController.ts` — gate `variantes_produits` au niveau du champ dans `createProduct`/`updateProduct`.
  - `src/services/paymentReminderService.ts` — le job saute désormais les factures des entreprises dont le plan n'a pas `relances_assistees` (vérifié une fois par entreprise via un cache en mémoire le temps du run).
  - `src/__tests__/planFeatures.test.ts` — réécrit intégralement pour la nouvelle matrice (tarifs/quotas à jour, Essentiel vérifié comme ayant accès aux modules de base, tests d'isolation cross-routeurs remplacés par les nouvelles clés fines).
  - `src/__tests__/backoffice.test.ts` — assertion du plan d'essai mise à jour (`'pro'` → `'business'`).

- Tests / résultats :
  ```
  npx tsc --noEmit → OK
  npm test (suite complète) → 387/389, 1 skip, 1 échec Cloudinary (pré-existant, environnemental)
  planFeatures.test.ts, backoffice.test.ts, dashboard.test.ts, profitability.test.ts,
  paymentReminder.test.ts, supplier.test.ts, stock.test.ts, crmProduct.test.ts → tous verts (95/95)
  ```
  Vérifié aussi en conditions réelles sur PostgreSQL (`modelpro_dev`, après purge des lignes `saas_plans`/`saas_subscriptions` existantes) : les 4 formules re-seedées avec les nouveaux tarifs/quotas/`features` exacts. Données de vérification nettoyées ensuite (scripts temporaires supprimés).

- Limites / écarts non couverts par le code (matrice du cahier, non implémentés — décision : ne pas inventer de nouveau module pour "reconcilier des formules") :
  - **Notifications e-mail** (Pro+) : aucune infrastructure d'envoi d'e-mail sortant n'existe dans le backend (recherché, aucune trace de `nodemailer`/équivalent). Les "notifications" actuelles sont uniquement internes à l'application (table `Notification`).
  - **Journal d'activité** (Pro+, au sens du cahier — un flux d'activité visible par l'équipe de l'entreprise) : seul existe `AuditLog`, un journal d'audit pour le back-office ATAABA (actions du staff plateforme), pas un journal côté entreprise cliente.
  - **Consolidation multisite** et **Reporting par site** (Business) : aucun champ `siteId` n'est tracké sur les documents commerciaux (devis/commandes/factures) — impossible de ventiler le chiffre d'affaires par site sans une évolution de schéma plus large que cette reconciliation.
  - **Reporting par utilisateur** (Business) : implémenté (section `equipeCommerciale` du dashboard), déjà présent depuis la Phase 3 — seulement recablé derrière la nouvelle clé `reporting_utilisateur`.
  - **Rôles et permissions** (Basique/Complet/Avancé selon la formule) : descriptif dans le cahier, mais Naatalix n'a pas de système de rôles personnalisables par formule — les `companyRole` existants (admin/manager/commercial/finance/stock/readonly) sont fixes et indépendants du plan.
  - **SMS/WhatsApp** (marqué "Option" sur toutes les formules dans le cahier — un module payant à part, pas encore construit).

- Prochaine étape : au choix de l'utilisateur — Documents/Export PDF, Phase 5, ou une des briques ci-dessus (notifications e-mail / journal d'activité entreprise / multisite) si la direction les priorise. Aucun commit Git effectué ; toujours en attente d'une demande explicite de l'utilisateur.

## 2026-09-24 — Upload du logo entreprise (stockage local, pas Cloudinary)

- Objectif : suite à la discussion sur `Company.logoUrl` (déjà utilisé pour incruster le logo dans les PDF générés depuis le 2026-09-22, mais sans route d'upload dédiée), l'utilisateur a confirmé que le backend Naatalix est hébergé sur un VPS à disque persistant — décision : stocker les logos directement sur le disque du serveur plutôt que d'introduire Cloudinary pour ce module. Le disque persistant lève l'objection habituelle contre le stockage local (perte des fichiers à chaque redéploiement sur un PaaS à filesystem éphémère type Render/Railway) : non applicable ici.

- Fichiers ajoutés/modifiés :
  - `src/services/localUploadService.ts` (nouveau) : `saveImageLocally(buffer, mimetype, subfolder)` — valide le mimetype (PNG/JPEG/WEBP uniquement), écrit dans `uploads/<subfolder>/<uuid>.<ext>` (extension dérivée du mimetype validé, jamais du nom de fichier client, pour éviter toute traversée de chemin), retourne une URL publique absolue construite à partir de `APP_BASE_URL`. `deleteLocalFile(url)` — suppression best-effort (jamais bloquante), n'agit que sur une URL de notre propre dossier `uploads/` et revérifie que le chemin résolu reste sous `UPLOADS_ROOT` avant de supprimer.
  - `src/controllers/companyController.ts` — nouveau `uploadCompanyLogo` : supprime l'ancien logo local (le cas échéant) après avoir enregistré le nouveau, pour ne pas accumuler des fichiers orphelins à chaque changement de logo.
  - `src/routes/companyRoutes.ts` — `POST /api/v1/companies/me/logo` (multipart, champ `logo`, `multer.memoryStorage()`, limite 5 Mo), réservé à `requireCompanyRole('admin')`, même garde que `PUT /me`.
  - `.env` / `.env.example` — nouvelle variable `APP_BASE_URL` (URL publique du serveur, sert à construire les URLs des fichiers locaux ; à renseigner avec le vrai domaine du VPS en production).
  - La route `app.use('/uploads', express.static(...))` existait déjà dans `app.ts` (résidu de l'époque pré-Cloudinary de ModèlePro) — réutilisée telle quelle, rien à ajouter côté service statique.

- Règles métier :
  - Réservé aux administrateurs de l'entreprise (`requireCompanyRole('admin')`), comme le reste de la fiche entreprise.
  - Seuls PNG/JPEG/WEBP acceptés (400 sinon) ; 5 Mo max (limite `multer`).
  - L'URL retournée est directement réutilisable par `pdfService.fetchLogoBuffer` (un simple `fetch()` HTTP), sans aucune modification de ce service — le code de génération PDF ne sait pas si le logo vient de Cloudinary ou du disque local.

- Tests ajoutés (`src/__tests__/company.test.ts`, nouveau describe "Logo entreprise (stockage local)") :
  - Upload réussi, URL conforme à `APP_BASE_URL`, relecture via `GET /companies/me` cohérente.
  - Un second envoi remplace l'URL précédente (et supprime l'ancien fichier — vérifié indirectement : un seul fichier reste sur le disque après le test, cf. résultats ci-dessous).
  - 400 sans fichier ; 403 pour un membre non-admin.
  - `afterAll` purge `uploads/logos/` (contrairement à un test Cloudinary qui échoue simplement sans credentials, l'upload local écrit de vrais fichiers sur le disque de dev — sans nettoyage, ils s'accumuleraient à chaque exécution de la suite).

- Commandes exécutées / Résultats :
  ```
  npx tsc --noEmit                    → OK
  npx jest company.test.ts            → 14/14 passants (dont les 2 nouveaux tests logo)
  npm test (suite complète)           → 389/391, 1 skip (PayTech, pré-existant), 1 échec Cloudinary (pré-existant, environnemental)
  ```
  `uploads/logos/` vérifié vide après la suite complète (purge `afterAll` effective, aucun fichier orphelin).

- Limites connues : `updateMyCompany` (`PUT /companies/me`) accepte toujours `logoUrl` comme chaîne brute en plus de la nouvelle route d'upload — comportement préexistant conservé (un admin peut encore coller une URL externe à la main s'il le souhaite), pas de restriction ajoutée dessus.

- Prochaine étape : au choix de l'utilisateur.

## 2026-09-24 — Phase 5 (durcissement sécurité) : rate limiting, 2FA staff (TOTP) et 2FA Naatalix (e-mail)

- Objectif : l'utilisateur a choisi de continuer sur la Phase 5 (durcissement sécurité) plutôt que sur une nouvelle brique fonctionnelle. Puis, en cours de route, a demandé si on pouvait "faire de l'OTP aussi" — clarifié comme : un OTP par e-mail (pas SMS, pas d'extension de la 2FA par application) pour les comptes Naatalix (`role = 'entreprise'`), le staff ATAABA gardant l'application d'authentification. L'utilisateur a aussi précisé en passant que "ModèlePro n'existe plus" — noté ici pour traçabilité, mais **aucune action n'a été prise sur le code ModèlePro** (rien supprimé/modifié) : cette remarque n'a pas été confirmée comme une instruction de suppression, à clarifier avec l'utilisateur avant toute action dessus.

- Rate limiting (`src/middlewares/rateLimitMiddleware.ts`, nouveau, `express-rate-limit`) :
  - `authLimiter` (10 req/15 min/IP) posé sur `/auth/register`, `/auth/login`, `/auth/2fa/verify`, `/companies/me/2fa/email/send-code`.
  - `apiLimiter` (300 req/15 min/IP) posé globalement sur `/api/v1` (`app.ts`).
  - Neutralisés (no-op) quand `NODE_ENV=test`/`JEST_WORKER_ID` — même détection que `config/database.ts` — sinon la suite Jest (des centaines de requêtes depuis la même IP) se ferait bloquer elle-même.

- 2FA du personnel ATAABA (TOTP, `src/services/twoFactorService.ts` + `src/controllers/twoFactorController.ts`, `otplib@12` + `qrcode`) :
  - `User` : nouveaux champs `twoFactorMethod` ('totp'|'email'|null), `twoFactorSecret`, `twoFactorEnabled`, `emailOtpCodeHash`, `emailOtpExpiresAt`.
  - `POST /backoffice/2fa/setup` (génère secret + QR, n'active rien) → `POST /backoffice/2fa/confirm` (code valide requis pour activer) → `POST /backoffice/2fa/disable` (code valide requis, pas seulement la session active) — toujours en libre-service sur son propre compte (`req.user.id`).
  - `POST /backoffice/staff/:id/2fa/reset` (superadmin uniquement) : filet de récupération si un membre perd son téléphone — lève la 2FA sans code, journalisé (`recordAudit`) avec l'identité de l'auteur.
  - `login()` (`authController.ts`) : si `twoFactorEnabled`, renvoie `{ requiresTwoFactor: true, method, tempToken }` au lieu du jeton normal — `tempToken` signé avec `purpose: '2fa_pending'`, 5 min, explicitement rejeté par `authMiddleware.protect` s'il est présenté comme un jeton d'accès normal (défense en profondeur, en plus de son absence de claims `role`/`platformRole`).
  - `POST /auth/2fa/verify` (public, body `{ tempToken, code }`) : échange le tempToken contre le vrai jeton une fois le code vérifié.

- 2FA des comptes Naatalix par e-mail (`src/services/emailService.ts` + `emailOtpService.ts` + `src/controllers/companyTwoFactorController.ts`, `nodemailer`) :
  - Pas de secret permanent : un code à 6 chiffres généré à chaque usage (connexion, activation, désactivation), hashé (SHA-256) et stocké avec une expiration de 10 minutes (`User.emailOtpCodeHash`/`emailOtpExpiresAt`), à usage unique.
  - `emailService.sendEmail` : sans `SMTP_HOST` configuré (dev local), le code est journalisé en console au lieu d'un vrai envoi — jamais d'erreur bloquante, même principe que le logo Cloudinary "échec silencieux".
  - `POST /companies/me/2fa/email/send-code` → `POST /companies/me/2fa/email/enable` (body `{code}`) → `POST /companies/me/2fa/email/disable` (body `{code}`) : toujours en libre-service sur son propre compte, aucun `requireCompanyRole` requis (n'importe quel membre protège son propre compte, jamais celui d'un collègue). Refuse l'activation si le compte n'a pas d'e-mail enregistré.
  - `login()`/`verifyTwoFactor()` généralisés pour couvrir les deux méthodes (`user.twoFactorMethod`).
  - **`devCode` en réponse HTTP** : hors production et seulement si SMTP n'est pas configuré, `login`/`send-code` renvoient aussi le code en clair dans la réponse JSON — pratique pour développer/tester sans service SMTP réel, jamais actif en production (vérifié explicitement par `process.env.NODE_ENV !== 'production'`, indépendant de toute variable que l'utilisateur pourrait oublier de configurer côté SMTP).

- Fichiers ajoutés/modifiés (résumé) : `src/middlewares/rateLimitMiddleware.ts`, `src/services/twoFactorService.ts`, `src/services/emailService.ts`, `src/services/emailOtpService.ts`, `src/controllers/twoFactorController.ts`, `src/controllers/companyTwoFactorController.ts`, `src/models/User.ts`, `src/server.ts` (migrations), `src/controllers/authController.ts`, `src/middlewares/authMiddleware.ts`, `src/utils/auth.ts`, `src/routes/authRoutes.ts`, `src/routes/backofficeRoutes.ts`, `src/routes/companyRoutes.ts`, `.env`/`.env.example` (`APP_BASE_URL` déjà présent, + `SMTP_*`).

- Tests ajoutés : `src/__tests__/rateLimit.test.ts` (2, dont un qui simule un environnement hors-test via `jest.isolateModulesAsync` pour vérifier un vrai 429), `src/__tests__/twoFactor.test.ts` (9, TOTP staff — génère de vrais codes via `otplib.authenticator` importé directement, même principe que pour PayTech ailleurs), `src/__tests__/emailTwoFactor.test.ts` (10, e-mail Naatalix — utilise `devCode`).

- Commandes exécutées / Résultats :
  ```
  npm install express-rate-limit otplib qrcode nodemailer (+ @types/qrcode, @types/nodemailer)
  npm audit                            → 13 vulnérabilités, inchangé avant/après (aucune nouvelle)
  npx tsc --noEmit && npm run build    → OK
  npx jest twoFactor.test.ts rateLimit.test.ts emailTwoFactor.test.ts → 21/21 passants
  npm test (suite complète)            → 410/412, 1 skip (PayTech, pré-existant), 1 échec Cloudinary (pré-existant, environnemental)
  ```
  Vérifié aussi en conditions réelles sur PostgreSQL (`modelpro_dev`) : les 5 nouvelles colonnes `users` confirmées présentes après migration automatique, cycle complet testé via `curl` (inscription → send-code → enable → login exige bien la 2FA avec un nouveau code) sur le serveur réel. Données de test nettoyées ensuite.

- Limites connues / décisions restantes :
  - Pas de doc OpenAPI ni de CI/CD (GitHub Actions) — repoussé, l'utilisateur avait mentionné les deux dans la description de "Phase 5" mais n'a validé que rate limiting + 2FA pour l'instant.
  - Le hash du code e-mail est un simple SHA-256 (pas de sel/coût comme bcrypt) : accepté ici parce que le code est à usage unique, expire en 10 minutes, et est protégé en amont par le rate limiting sur `/2fa/email/send-code` et `/auth/2fa/verify` — un bcrypt coûteux n'apporterait rien contre un brute-force déjà bloqué par ailleurs, et ralentirait inutilement chaque connexion.
  - Pas de limite explicite sur le nombre d'essais de code (au-delà du rate limiting générique) — à revisiter si besoin.
  - Remarque "ModèlePro n'existe plus" de l'utilisateur non traitée (voir Objectif ci-dessus) — à clarifier avant toute action.

- Prochaine étape : clarifier le statut de ModèlePro avec l'utilisateur ; sinon, au choix — doc OpenAPI, CI/CD, ou une autre brique.

## 2026-09-25 — Déconnexion serveur (JWT + sessionVersion)

- Objectif : clarification obtenue sur "ModèlePro n'existe plus" — c'est l'ancien nom, devenu Naatalix (pas une instruction de suppression ; noté en mémoire, aucune action sur le code). L'utilisateur a ensuite demandé un état des lieux priorisé du reste du travail, avec un point qui l'a interpellé : il n'y avait pas de vraie déconnexion côté serveur (un jeton JWT restait valide jusqu'à son expiration naturelle, 7 jours, même après "déconnexion" côté client). Demandé de traiter ce point en premier, avant l'intégration DexPay (guide fourni, à traiter ensuite).

- Solution retenue : compteur `sessionVersion` par utilisateur plutôt qu'une liste de jetons révoqués (pas de table à nettoyer, O(1) par utilisateur) :
  - `User.sessionVersion` (INTEGER, défaut 0). Le JWT embarque sa valeur au moment de l'émission (claim `sv`).
  - `authMiddleware.protect` devient asynchrone et revalide le compte en base à CHAQUE requête (pas seulement décoder le JWT) : compare `user.sessionVersion` au claim `sv`, et vérifie `user.statut === 'actif'`.
  - `POST /auth/logout` (protégé) incrémente `sessionVersion` : tous les jetons émis avant deviennent invalides immédiatement, sur tous les appareils (pas de session par appareil trackée — un logout déconnecte partout, jugé plus utile qu'un logout partiel vu qu'aucun tracking par device n'existe). Une reconnexion normale (`/auth/login`, `/auth/2fa/verify`) émet un nouveau jeton avec la valeur à jour.
  - `generateToken()` (`utils/auth.ts`) : `sessionVersion` devient un paramètre obligatoire (pas de valeur par défaut, pour ne jamais émettre un jeton avec une valeur périmée par erreur) — tous les points d'émission mis à jour (`register`, `login`, `verifyTwoFactor`, `registerCompany`).

- Effet de bord positif (gratuit, puisque `protect` fait déjà la lecture en base) : un compte suspendu en cours de session (`User.statut = 'suspendu'`) perd l'accès immédiatement, plutôt que de garder un jeton valide jusqu'à 7 jours. Avant cette session, seul le personnel ATAABA bénéficiait de cette revalidation (`platformMiddleware.requirePlatformStaff`) ; c'est maintenant vrai pour tous les rôles (client/artisan/admin/entreprise/ataaba_staff).

- Fichiers modifiés : `src/models/User.ts`, `src/server.ts` (migration `session_version`), `src/utils/auth.ts`, `src/middlewares/authMiddleware.ts`, `src/controllers/authController.ts` (nouveau `logout`), `src/controllers/companyController.ts`, `src/routes/authRoutes.ts`.

- Tests ajoutés : `src/__tests__/logout.test.ts` (4) — logout invalide le jeton courant, une reconnexion en émet un nouveau distinct et définitivement séparé de l'ancien, logout invalide tous les appareils à la fois, un compte suspendu en cours de route perd l'accès immédiatement, logout sans jeton refusé.

- Tests existants adaptés : tous les appels directs à `generateToken(...)` dans les fichiers de test (23 occurrences, 12 fichiers) nécessitaient déjà `sessionVersion` en 3ᵉ argument (signature devenue obligatoire) — complété à `0` (valeur par défaut d'un utilisateur de test fraîchement créé). `backoffice.test.ts` : l'assertion "personnel suspendu perd l'accès" passe de 403 à 401 (détecté maintenant par `protect` avant même d'atteindre `requirePlatformStaff`).

- Commandes exécutées / Résultats :
  ```
  npx tsc --noEmit                  → OK
  npx jest logout.test.ts           → 4/4 passants
  npm test (suite complète)         → 414/416, 1 skip (PayTech, pré-existant), 1 échec Cloudinary (pré-existant, environnemental)
  ```
  Vérifié aussi en conditions réelles sur PostgreSQL : colonne `session_version` confirmée après migration automatique, cycle complet testé via `curl` sur le serveur réel (accès avant logout → 200, même jeton après logout → 401, nouveau jeton après reconnexion → 200). Données de test nettoyées ensuite.

- Limites connues : pas de session par appareil — un logout déconnecte tous les appareils d'un même compte, pas seulement celui qui l'a demandé (décision assumée, cf. ci-dessus). `protect` fait désormais une lecture en base à chaque requête authentifiée (avant : uniquement un décodage JWT, aucun accès base) — impact de performance mineur mais réel sur l'ensemble de l'API, nécessaire pour une vraie révocation.

- Prochaine étape : intégration des paiements d'abonnement via DexPay (guide de mise en place fourni par l'utilisateur le 2026-09-25 — sandbox, produits/clients/abonnements côté serveur, webhook avec vérification de signature HMAC-SHA256, ne jamais activer un abonnement avant confirmation webhook).

## 2026-09-25 — Facturation des abonnements Naatalix via DexPay

- Objectif : implémenter le paiement des abonnements Naatalix (jusqu'ici gérés uniquement manuellement depuis le back-office) via DexPay, d'après un guide de mise en place détaillé fourni par l'utilisateur (endpoints, authentification par deux types de clés, format du webhook, piège à éviter). Contrairement à PayTrack (intégration construite sur un contrat hypothétique, jamais vérifié), ce guide donne un vrai contrat à suivre — même principe de prudence conservé : tout ce qui dépend du format réel de l'API DexPay reste isolé dans `dexpayService.ts`.

- Fichiers ajoutés :
  - `src/services/dexpayService.ts` — client DexPay : `createProduct` (mise en place initiale), `createCustomer`, `createSubscription`, `cancelSubscription` (authentifiés `x-api-secret`, jamais appelés depuis un frontend), `listPaymentProviders` (`x-api-key`), `verifyWebhookSignature` (HMAC-SHA256 du corps brut avec la clé secrète, comparaison en temps constant), `getProductId` (lit `DEXPAY_PRODUCT_<PLAN>_<PERIODE>` depuis l'environnement).
  - `src/models/DexpayEvent.ts` — journal des webhooks reçus, même rôle que `PaytrackEvent`.
  - `src/controllers/dexpayController.ts` — `subscribeCompany`/`cancelCompanySubscription` (actions admin entreprise) et `handleWebhook` (traite `checkout.completed`, `subscription.payment.succeeded/failed`, `subscription.cancelled`) + `listEvents` (supervision back-office).
  - `src/setupDexpayProducts.ts` (+ script npm `dexpay:setup-products`) — crée les 6 produits DexPay (Essentiel/Pro/Business × mensuel/annuel — Entreprise exclue, sur devis) et affiche les variables `DEXPAY_PRODUCT_*` à coller dans `.env`. À lancer UNE SEULE FOIS (DexPay ne permet pas de relister les produits par nom).
  - `CompanySubscription` : nouveaux champs `dexpayCustomerId`/`dexpaySubscriptionId`.
  - `subscriptionService.notifyCompanyAdmins` exporté (était privé) pour être réutilisé par le webhook DexPay (notification d'échec de paiement) sans dupliquer cette logique.

- Règles métier (issues du guide) :
  - **Jamais d'activation optimiste** : `subscribeCompany` crée le client/abonnement DexPay et renvoie l'URL de paiement, mais ne touche jamais au statut de `CompanySubscription` — seul le webhook confirmé active (`renewSubscription`, déjà existant depuis la Phase 4) ou suspend. Même principe pour `cancelCompanySubscription` : la demande est transmise à DexPay, la suspension réelle attend `subscription.cancelled`.
  - Webhook exposé hors authentification JWT (`POST /api/v1/integrations/dexpay/webhook`, à renseigner dans le tableau de bord marchand DexPay — le champ `webhook_url` des requêtes API est ignoré par DexPay, confirmé par l'utilisateur), confiance uniquement par la signature `X-Webhook-Signature`.
  - `checkout.completed` : accepte `status` = `'completed'` ET `'success'` (ambiguïté du guide lui-même : "leur doc dit success, en pratique c'est completed").
  - Payload accepté sous `data` OU à plat à la racine (`const data = payload.data ?? payload`).
  - Entreprise retrouvée par `dexpaySubscriptionId` d'abord, repli sur `metadata.organization_id` sinon (les deux testés).
  - Routes `subscribe`/`cancel` volontairement SANS `enforceSubscription` : une entreprise suspendue/expirée doit pouvoir payer pour se réactiver — même exception déjà appliquée aux routes `/support`.

- **Hypothèses non confirmées par le guide (à vérifier dès l'accès à un vrai sandbox DexPay)** :
  - Le champ exact contenant l'URL de paiement dans la réponse de `POST /subscriptions` (le guide ne détaille que l'id) — `checkout_url`/`payment_url`/`url` sont tous les trois tentés, dans cet ordre.
  - Le nom du champ d'identifiant unique d'un événement webhook, nécessaire à une vraie idempotence (PayTrack, lui, documente `event_id`) — plusieurs noms plausibles sont tentés (`id`, `event_id`, `webhook_id`) ; en leur absence, l'événement est traité sans déduplication stricte. Accepté ici car les transitions appliquées (activer/suspendre/notifier) sont idempotentes par nature — rejouer "activer" n'a pas d'effet de bord, contrairement à l'enregistrement d'un `InvoicePayment` côté PayTrack.
  - Le code devise attendu par DexPay pour des montants en FCFA (`XOF` utilisé par défaut dans `setupDexpayProducts.ts`).

- Tests ajoutés : `src/__tests__/dexpay.test.ts` (15) — configuration manquante (503), création client+abonnement sans activation locale, refus pour un non-admin, signature invalide (401), activation par `subscription.payment.succeeded`, idempotence sur rejeu du même `eventId`, `checkout.completed` (statut abouti vs non abouti), échec de paiement sans blocage, annulation → suspension, repli par `metadata.organization_id`, payload à plat, abonnement introuvable (anomalie, jamais 500), annulation demandée sans suspension immédiate. Webhooks envoyés avec une vraie signature HMAC calculée sur le corps brut exact (même technique que `paytrack.test.ts` : `JSON.stringify` pré-calculé, jamais re-sérialisé par supertest).

- Commandes exécutées / Résultats :
  ```
  npx tsc --noEmit && npm run build   → OK
  npx jest dexpay.test.ts             → 15/15 passants
  npm test (suite complète)           → 429/431, 1 skip (PayTech, pré-existant), 1 échec Cloudinary (pré-existant, environnemental)
  ```
  Vérifié aussi en conditions réelles sur PostgreSQL : colonnes `dexpay_customer_id`/`dexpay_subscription_id` et table `integration_dexpay_events` confirmées après migration automatique.

- Limites connues : rien de tout ceci n'a encore tourné contre le vrai sandbox DexPay (seulement `fetch` mocké en test) — avant mise en production, lancer `npm run dexpay:setup-products` avec de vraies clés sandbox, faire un premier `subscribe` réel et vérifier la forme exacte de la réponse (URL de paiement) et du webhook reçu, corriger les hypothèses ci-dessus si elles diffèrent.

- Prochaine étape : test réel contre le sandbox DexPay dès que l'utilisateur fournit des clés `DEXPAY_PUBLIC_KEY`/`DEXPAY_SECRET_KEY` de test ; sinon, au choix — notifications e-mail métier, journal d'activité, doc OpenAPI/CI/CD.

### Correction — les 3 hypothèses vérifiées par l'utilisateur contre un vrai sandbox DexPay (autre projet)

L'utilisateur a vérifié les 3 points ouverts ci-dessus contre du code réel déjà en production sur DexPay (pas des suppositions) :

1. **Enveloppe de réponse — bug réel corrigé, plus large que prévu.** Toute réponse DexPay (`/products`, `/customers`, `/subscriptions`) enveloppe son contenu utile sous une clé `data`. `dexpayService.secretRequest` ne déballait PAS cette enveloppe (il renvoyait le corps brut tel quel) — `createProduct`/`createCustomer` lisaient donc `id` au mauvais niveau et auraient échoué dès le premier vrai appel, pas seulement `createSubscription` comme supposé initialement. Corrigé : `secretRequest` renvoie désormais `raw.data ?? raw`.
   - Particularité confirmée de `/subscriptions` : l'id de l'abonnement est imbriqué sous `data.subscription.id` (pas `data.id` comme pour les deux autres endpoints), et deux URLs de paiement sont exposées sous `data.payment` : `payment_url` (prod) et `sandbox_payment_url` (à utiliser en sandbox pour un vrai test de paiement). `createSubscription` choisit désormais la bonne URL selon que `DEXPAY_BASE_URL` contient `sandbox` ou non (`isSandbox()`), avec repli sur l'autre champ si celui attendu est absent.
2. **Identifiant unique d'événement webhook — confirmé non nécessaire.** L'utilisateur n'a jamais eu besoin de dédupliquer par id dans son intégration DexPay en production : ses handlers (`activate()`/`suspend()`) sont naturellement idempotents (réappliquer le même statut plusieurs fois ne change rien), ce qui absorbe les doublons de livraison que certains fournisseurs déclenchent en cas de timeout. C'est exactement la conception déjà retenue ici (voir §"Webhook" plus haut) — validée, pas seulement "acceptée comme limite". Le commentaire du code a été mis à jour pour refléter que c'est un choix confirmé, pas une incertitude.
3. **Devise `XOF` — confirmée à 100%**, vérifié à la fois à la création des produits et sur de vrais webhooks reçus en sandbox.

- Fichiers modifiés : `src/services/dexpayService.ts` (déballage de l'enveloppe `data`, lecture correcte de `data.subscription.id` et `data.payment.{payment_url,sandbox_payment_url}`, sélection sandbox/prod), `src/controllers/dexpayController.ts` (commentaire mis à jour), `src/setupDexpayProducts.ts` (commentaire devise mis à jour), `src/__tests__/dexpay.test.ts` (mocks alignés sur la vraie forme de réponse, `DEXPAY_BASE_URL` de test contient désormais `sandbox` pour exercer la sélection d'URL).

- Résultats : `npx tsc --noEmit && npm run build` → OK ; `npx jest dexpay.test.ts` → 15/15 ; suite complète → 429/431 (inchangé, mêmes 2 échecs connus).

- Prochaine étape : inchangée — un vrai test contre le sandbox DexPay reste la meilleure vérification finale, mais les trois plus gros risques (enveloppe de réponse, URL de paiement, devise) sont désormais réglés sur la base d'un retour d'expérience réel plutôt que d'une supposition.

### Test réel contre le sandbox DexPay (clés fournies par l'utilisateur, 2026-09-25)

- Objectif : l'utilisateur a fourni ses vraies clés de test DexPay (`pk_test_...`/`sk_test_...`). Vérification en conditions réelles plutôt que mockées, jusqu'au bout de ce qui est possible sans passer par un vrai paiement en navigateur.

- Déroulé :
  1. Clés ajoutées à `.env` (jamais dans une commande shell, jamais affichées à nouveau dans les réponses — confirmé `.env` toujours gitignoré avant et après).
  2. `npm run dexpay:setup-products` lancé contre le vrai sandbox → **succès** : les 6 produits (Essentiel/Pro/Business × mensuel/annuel) créés réellement, ids récupérés et collés dans `.env`. Confirme au passage que le correctif de déballage de l'enveloppe `data` (voir section précédente) était correct pour `/products`.
  3. Premier essai de `subscribe` en conditions réelles → échoué avec `DEXPAY_NOT_CONFIGURED`, alors que `.env` était correct. Cause identifiée : cette session avait accumulé plusieurs processus serveur (`npm run dev`) jamais proprement arrêtés au fil des tests précédents (chaque `taskkill` ne visait que le PID lié au port 5000 au moment T, laissant les processus parents `ts-node-dev`/`npm` de l'arborescence orphelins) — un de ces processus fantômes, démarré avant l'ajout des clés DexPay à `.env`, a fini par reprendre le port 5000. **Pas un bug du code.** Tous les processus Node liés au projet tués (`Get-CimInstance Win32_Process` + `Stop-Process`), un seul serveur relancé proprement.
  4. Nouvel essai → **succès réel** : `POST /companies/me/subscription/dexpay/subscribe` a créé un vrai client et un vrai abonnement DexPay, renvoyé `checkoutUrl` (`https://checkout.dexpay.africa/sandbox/SUB-...`, vérifié HTTP 200) et `dexpaySubscriptionId`. Vérifié en base : `CompanySubscription.statut` restée à `essai` (jamais activée avant confirmation), `dexpayCustomerId`/`dexpaySubscriptionId` bien enregistrés.
  5. Données de test nettoyées, tous les processus serveur arrêtés proprement.

- Confirmé par ce test réel (au-delà des 3 points déjà vérifiés par l'utilisateur la fois précédente) : l'authentification `x-api-secret` fonctionne avec les vraies clés, `createCustomer`/`createSubscription` fonctionnent de bout en bout avec le correctif d'enveloppe `data`, `sandbox_payment_url` est bien la bonne URL à utiliser en sandbox.

- Limite restante : la confirmation par **webhook réel** n'a pas pu être testée (nécessite soit de compléter un paiement dans un navigateur sur l'URL de checkout, soit un tunnel public — `npm run tunnel`, déjà présent dans le projet pour PayTech — pour que DexPay puisse joindre `POST /api/v1/integrations/dexpay/webhook`, plus configurer cette URL dans le tableau de bord marchand DexPay). Dès que l'utilisateur veut aller jusqu'au bout (paiement réel en sandbox + réception du webhook), la prochaine étape est de monter ce tunnel ensemble.

- Point de vigilance opérationnel noté pour la suite : toujours arrêter complètement l'arborescence de processus d'un `npm run dev` lancé en arrière-plan (pas seulement le PID sur le port), pour éviter de retester par erreur contre un processus obsolète.

### Webhook réel reçu via ngrok + tableau de bord DexPay (2026-09-25)

- L'utilisateur a monté son propre tunnel (ngrok, `pectin-spew-breeches.ngrok-free.dev`) et utilisé la fonction "Envoyez un événement de test" du tableau de bord marchand DexPay, configurée sur l'URL `https://.../api/v1/webhooks/dexpay`. Un premier essai a renvoyé 502 : chemin non reconnu (`/api/v1/webhooks/dexpay` ≠ le chemin construit `/api/v1/integrations/dexpay/webhook`) ET aucun serveur local actif à ce moment (arrêté à la fin de l'étape précédente). Corrigé par un alias `app.post('/api/v1/webhooks/dexpay', ...)` dans `app.ts` (même handler que le chemin canonique — évite à l'utilisateur de retoucher la configuration déjà saisie côté DexPay) puis redémarrage propre du serveur.

- Deuxième essai : **200 OK**, confirmé à la fois côté ngrok (log `POST /api/v1/webhooks/dexpay 200 OK`) et côté base (`integration_dexpay_events`, un nouvel enregistrement). Valide tout le pipeline réel : DexPay → ngrok → notre serveur → vérification de signature HMAC (avec la vraie clé secrète) → réponse 200.

- **Payload réel `checkout.completed` capturé** (précieux, absent du guide initial) :
  ```json
  {
    "event": "checkout.completed", "reference": "TEST_...", "checkout_session_id": "...",
    "transaction_id": "...", "amount": 10000, "currency": "XOF", "status": "completed",
    "metadata": { "test": true }, "payment_attempt_id": "...", "operator": "wave_sn",
    "payment_method": "mobile_money", "customer": { "name": "...", "phone": "...", "email": "..." }
  }
  ```
  - **Aucune enveloppe `data`** pour les webhooks — les champs sont bien à plat à la racine, ce que `handleWebhook` gère déjà correctement (`payload.data ?? payload`).
  - **Aucun champ `subscription_id`** pour `checkout.completed` — contrairement à l'hypothèse initiale du guide. Cet événement s'articule autour d'une session de paiement (`checkout_session_id`/`reference`/`transaction_id`), pas directement d'un abonnement. Le repli déjà en place sur `metadata.organization_id` reste donc le SEUL mécanisme de corrélation qui peut fonctionner pour cet événement précis — non cassé par cette découverte, mais son importance est plus grande que prévu.
  - Résultat `anomalie` obtenu ("Abonnement introuvable") : **attendu et correct**, pas un bug — le bouton de test du tableau de bord DexPay envoie un événement synthétique (`metadata: {"test": true}`) non rattaché à un vrai abonnement Naatalix. Le comportement recherché (200, pas de crash, anomalie journalisée) est exactement celui obtenu.

- Incertitude restant à lever : est-ce que DexPay propage réellement les `metadata` passées à la création de l'abonnement (`organization_id`/`plan`/`cycle`) jusque dans l'événement `checkout.completed` d'un VRAI paiement complété (pas le test synthétique du tableau de bord) ? Seul un vrai paiement en sandbox (via l'URL de checkout obtenue par `subscribeCompany`) le confirmerait. Proposé à l'utilisateur comme prochaine étape s'il souhaite aller jusqu'au bout.

- Fichiers modifiés : `src/app.ts` (alias de route `/api/v1/webhooks/dexpay`).

### Correction de la corrélation webhook : `checkout_session_id` (2026-09-25)

- Objectif : lever l'incertitude ci-dessus. L'utilisateur a partagé un exemple de payload d'un **vrai paiement réussi** tiré de l'historique DexPay (pas un test synthétique) — réponse à sa propre question "quelle différence avec ce qu'on envoie à PayTech".

- **Confirmé : l'incertitude était fondée, et dans le mauvais sens.** Le payload réel a `"metadata": {"merchant_id": "..."}` — DexPay remplace intégralement les metadata qu'on lui passe à la création de l'abonnement par les siennes. `metadata.organization_id` ne survit JAMAIS jusqu'au webhook `checkout.completed`. Le mécanisme de repli sur lequel reposait toute la corrélation pour cet événement était donc inopérant en pratique.

- **Corrigé** en inspectant la réponse complète (non tronquée) de `POST /subscriptions` contre le vrai sandbox : `data.payment.checkout_session_id` existe et correspond exactement au `checkout_session_id` reçu dans le webhook `checkout.completed`. C'est un identifiant stable, connu dès la création de l'abonnement — contrairement aux metadata, qui ne sont pas fiables.
  - Nouveau champ `CompanySubscription.dexpayCheckoutSessionId`, renseigné par `subscribeCompany` à la création.
  - `dexpayService.createSubscription` renvoie désormais aussi `checkoutSessionId`.
  - `dexpayController.findSubscription` tente désormais, dans l'ordre : `subscription_id` (renouvellements, non encore vérifié en réel) → **`checkout_session_id` (nouveau, le cas qui compte vraiment pour l'activation initiale)** → `metadata.organization_id` (dernier repli, sans certitude qu'un événement réel le fournira un jour).
  - Tests mis à jour : le mock de `/subscriptions` inclut désormais `checkout_session_id` ; un nouveau test reproduit exactement la forme du payload réel (`checkout.completed`, ni `subscription_id` ni `organization_id`, seulement `merchant_id` dans `metadata`) et vérifie l'activation via `checkout_session_id` uniquement.

- Migration : `saas_subscriptions.dexpay_checkout_session_id` (VARCHAR). `npx tsc --noEmit`, `npm run build`, `npx jest dexpay.test.ts` (15/15) → OK.

- **Nouveau test réel tenté, bloqué côté DexPay (pas un bug Naatalix).** Après avoir annulé l'ancien abonnement de test resté "pending" (bloquait la création d'un nouveau via une erreur 409 — confirme au passage que le paiement précédent n'avait en réalité jamais abouti côté DexPay, cohérent avec l'absence de webhook observée avant cette session de débogage), un nouvel abonnement a été créé avec le correctif en place (`checkout_session_id` bien capturé). L'utilisateur a complété un paiement réel, redirigé vers `app.dexpay.africa/subscriptions/success` — page qui a renvoyé une **erreur 502 Cloudflare** côté DexPay. Vérification croisée :
  - Journal des webhooks DexPay (tableau de bord) : aucune ligne pour cette transaction — la seule livraison "Succes" visible est un événement history antérieur et sans rapport.
  - Interface d'inspection ngrok (`127.0.0.1:4040`, "All Requests") : une seule requête reçue depuis le démarrage du tunnel, celle du bouton "envoyer un test" d'avant — rien depuis.
  - Conclusion : DexPay n'a jamais déclenché l'envoi d'un webhook pour ce paiement (pas un échec de livraison avec retries, une absence totale de tentative), cohérent avec leur propre page de succès en 502 au même moment — panne/instabilité ponctuelle de leur plateforme sandbox, pas un problème de notre côté. Tout ce qu'on contrôle a été validé positivement au passage : réception + vérification de signature (test réel réussi plus tôt), création réelle de client/abonnement/session de paiement, nouvelle logique de corrélation.

- Prochaine étape : retester plus tard (ou dès que l'utilisateur voit la plateforme DexPay stabilisée) avec un nouvel abonnement — celui utilisé pour ce test a été nettoyé (entreprise de test supprimée de la base).

## 2026-09-25 — Journal d'activité entreprise

- Objectif : suite au choix de l'utilisateur sur la liste de priorités ("journal d'activité"). Un flux "qui a fait quoi et quand" dans l'entreprise, visible par toute l'équipe — distinct du journal interne ATAABA (`AuditLog`, `actorType='staff'`, consultable uniquement au back-office par le personnel plateforme).

- Décision de conception : pas de nouveau modèle. `AuditLog` avait déjà exactement la bonne forme (`actorUserId`, `actorType`, `companyId`, `action`, `objectType`, `objectId`, `details`, `createdAt`) et prévoyait déjà `actorType: 'company_user'` sans qu'aucun contrôleur métier ne l'utilise jamais — le gap n'était pas un manque de modèle, mais l'absence totale d'appels `recordAudit` dans les contrôleurs CRM/ERP (vérifié : seuls back-office/PayTrack/DexPay/support/2FA staff l'utilisaient) et l'absence d'un point d'entrée pour qu'une entreprise consulte son propre journal.

- Fichiers modifiés :
  - `src/services/auditService.ts` — nouveau `recordCompanyActivity(req, action, objectType?, objectId?, details?)`, raccourci pré-rempli (`actorType: 'company_user'`, `companyId`/`actorUserId` lus sur `req.user`) pour éviter de répéter ces champs à chaque appel.
  - `src/controllers/companyController.ts` — nouveau `listActivityLog` (`GET /companies/me/activity-log?action=&userId=&page=&limit=`), lecture ouverte à tout membre de l'entreprise (y compris `readonly` — outil de visibilité d'équipe, pas une donnée sensible réservée aux admins), filtré strictement sur `actorType='company_user'` pour ne jamais exposer les actions du personnel ATAABA sur cette entreprise. Résout aussi le nom de l'auteur (`prenom nom`) pour chaque entrée plutôt que de renvoyer un `actorUserId` brut. Appels `recordCompanyActivity` ajoutés à `createMember`/`updateMemberRole`/`removeMember`/`updateMyCompany`.
  - `src/controllers/crmCustomerController.ts` — `createCustomer` (`client.cree`), `convertToClient` (`prospect.converti`).
  - `src/controllers/quoteController.ts` — la factory `transition()` partagée par `sendQuote`/`acceptQuote`/`refuseQuote`/`expireQuote` loggue désormais `devis.<statut>` en un seul point (au lieu de dupliquer l'appel dans chacune).
  - `src/controllers/salesOrderController.ts` — même principe pour la factory `transition()` (`confirmOrder`/`startPreparationOrder`/`cancelOrder` → `commande.<statut>`), plus `convertQuoteToOrder` (`devis.transforme_en_commande`) et `deliverOrder` (`commande.livree`, hors factory car couplé aux mouvements de stock).
  - `src/controllers/invoiceController.ts` — `sendInvoice`, `cancelInvoice`, `createCreditNote` (`avoir.cree`), `recordPayment` (`facture.paiement_enregistre`, montant dans les détails).
  - `src/controllers/purchaseOrderController.ts` — même principe (factory `transition()` → `commande_achat.<statut>`, `receivePurchaseOrder`, `recordPayment`).
  - `src/controllers/stockController.ts` — `createMovement` (`stock.mouvement_<type>`), `recordInventaire` (`stock.inventaire`, avant/après).
  - `src/routes/companyRoutes.ts` — `GET /me/activity-log`.

- Aucune migration nécessaire : réutilise la table `audit_logs` existante, aucune nouvelle colonne.

- Tests ajoutés : `src/__tests__/activityLog.test.ts` (8) — ajout de membre avec auteur/détails corrects, création client filtrable par préfixe d'action, cycle devis (envoyé/accepté/transformé en commande), paiement de facture avec montant dans les détails, lecture autorisée à un rôle `readonly`, isolation stricte entre entreprises, changement de rôle/retrait de membre, **actions du personnel ATAABA invisibles dans ce journal** (créé un staff, suspendu l'entreprise via le back-office, vérifié que rien n'apparaît côté entreprise).

- Commandes exécutées / Résultats :
  ```
  npx tsc --noEmit && npm run build   → OK
  npx jest activityLog.test.ts        → 8/8 passants
  npm test (suite complète)           → 437/439, 1 skip (PayTech, pré-existant), 1 échec Cloudinary (pré-existant, environnemental)
  ```
  Vérifié aussi en conditions réelles sur PostgreSQL : création d'un client réelle suivie d'une lecture du journal via `curl`, entrée retrouvée avec le bon auteur et les bons détails. Données nettoyées ensuite.

- Limites connues / périmètre volontairement non couvert (pour rester dans un temps raisonnable, pas un oubli) :
  - **Pipeline commercial** (opportunités, changement d'étape, tâches/rendez-vous) — pas encore instrumenté. Ajout naturel si le besoin se confirme, même mécanisme (`recordCompanyActivity`) à répliquer dans `opportunityController.ts`/`crmTaskController.ts`.
  - **Fournisseurs** (création, pas seulement les commandes d'achat) et **catalogue produits** — non instrumentés, jugés plus bas niveau/moins "activité d'équipe" que les documents commerciaux.
  - Pas de pagination infinie ni de export CSV de ce journal — juste la pagination page/limit standard déjà utilisée ailleurs.

- Prochaine étape : au choix de l'utilisateur — notifications e-mail métier, rentabilité avancée (à préciser), reporting multisite, ou étendre le journal d'activité au pipeline commercial si jugé prioritaire.

## 2026-09-25 — Notifications e-mail pour les alertes métier

- Objectif : suite à la liste de priorités de l'utilisateur. Les alertes métier de Naatalix (échéance de facture, abonnement bientôt expiré, échec de paiement DexPay) restaient uniquement des notifications in-app + push, jamais un e-mail — malgré l'infrastructure e-mail déjà construite le 2026-09-25 pour l'OTP (`emailService.ts`).

- Décision de conception : pas de nouvelle route ni de nouveau déclencheur. Les alertes métier passent déjà toutes par deux fonctions dédiées, déjà scoping "entreprise" (par opposition à `notificationService.createNotification`, partagée avec ModèlePro/client/artisan et volontairement non touchée — un e-mail à chaque nouveau message ou statut de rendez-vous serait du spam, hors sujet ici) :
  - `subscriptionService.notifyCompanyAdmins` (abonnement bientôt expiré/expiré, échec de paiement DexPay).
  - `paymentReminderService.notifyCompanyFinance` (échéance de facture à J-3, facture en retard).
  Un seul ajout dans chacune : `if (user.email) await sendEmail(user.email, titre, description);` juste après la notification in-app existante — même titre/description, aucune nouvelle logique métier.

- Fichiers modifiés : `src/services/subscriptionService.ts`, `src/services/paymentReminderService.ts` (+ commentaire mis à jour, qui disait encore "e-mail non construit" — obsolète depuis l'OTP par e-mail).

- Tests ajoutés/complétés (via `jest.spyOn(emailService, 'sendEmail')`, pas d'envoi réel) :
  - `src/__tests__/paymentReminder.test.ts` — un membre avec e-mail enregistré reçoit bien l'e-mail de rappel J-3.
  - `src/__tests__/dexpay.test.ts` — `subscription.payment.failed` envoie l'e-mail à l'admin (`seydou@example.com`, déjà utilisé dans ce fichier).
  - `src/__tests__/backoffice.test.ts` — l'alerte d'expiration d'essai envoie l'e-mail à l'admin.

- Commandes exécutées / Résultats :
  ```
  npx tsc --noEmit                     → OK
  npx jest paymentReminder.test.ts dexpay.test.ts backoffice.test.ts → 43/43 passants
  npm test (suite complète)            → 439/441, 1 skip (PayTech, pré-existant), 1 échec Cloudinary (pré-existant, environnemental)
  ```
  Vérifié aussi en conditions réelles : facture réelle créée avec échéance à J+3 sur PostgreSQL, job de relance déclenché manuellement, e-mail journalisé en console (SMTP non configuré en dev, comportement attendu) avec le bon destinataire/sujet/contenu. Données nettoyées ensuite.

- Limite connue : toujours pas de canal vers le client final (SMS/WhatsApp, en option non construite) — ces e-mails restent internes à l'équipe de l'entreprise (admin/finance), pas envoyés au client qui doit payer.

- Prochaine étape : au choix de l'utilisateur — rentabilité avancée (à préciser), reporting multisite, ou étendre le journal d'activité/les alertes e-mail au pipeline commercial.

## 2026-09-26 — Reporting multisite + Rentabilité avancée (prévisionnel/réel, trésorerie, score /100)

- Objectif : l'utilisateur a choisi de traiter les deux plus gros chantiers restants ensemble. Clarifié au préalable par questions ciblées (les deux items étaient marqués "à préciser") :
  - Rentabilité avancée : prévisionnel vs réel automatisé + trésorerie avancée + score /100 — **pas** l'assistant IA (nécessiterait une vraie API IA, coût et clé à fournir, hors périmètre pour l'instant).
  - Reporting multisite : confirmé qu'on fait le changement de structure de données (ajout d'un site sur chaque document commercial), pas juste une maquette.

### Reporting multisite

- Ajout de `siteId` (nullable) sur `Quote`, `SalesOrder`, `Invoice`, `PurchaseOrder` — nouvelle association `belongsTo(Site)` sur chacun. Nullable à dessein : un document déjà existant ou une entreprise mono-site n'ont pas à en avoir un, `hasFeature`/le reste du système ne dépend jamais de sa présence.
- Nouveau `src/services/siteService.ts` — `resolveSiteId(companyId, requestedSiteId)` : le site demandé s'il appartient bien à l'entreprise, sinon le site principal, sinon le premier site actif trouvé. **Ne bloque jamais** la création d'un document, y compris si un `siteId` d'une autre entreprise est envoyé par erreur (retombe silencieusement sur le site principal — testé explicitement).
- Câblé dans les 4 `create*` (body `siteId` optionnel) + hérité automatiquement dans les conversions/dérivations : devis → commande (`convertQuoteToOrder`), commande → facture (`convertOrderToInvoice`), facture → avoir (`createCreditNote`).
- Nouvelle clé `PLAN_FEATURE_KEYS.REPORTING_SITE` (Business uniquement, cahier §13 "Consolidation multisite"/"Reporting par site") — ajoutée à `BUSINESS_FEATURES`.
- Dashboard (`dashboardController.buildSiteIndicators`) : nouvelle section `parSite` — CA, nombre de ventes, achats et valeur de stock ventilés par site sur la période, gated par `REPORTING_SITE`. Un document sans site (créé avant cette migration) apparaît sous "Sans site" plutôt que d'être silencieusement exclu du total.
- Migration : `crm_quotes.site_id`, `crm_sales_orders.site_id`, `crm_invoices.site_id`, `crm_purchase_orders.site_id` (VARCHAR→INTEGER, toutes nullable).
- Tests : `src/__tests__/multisite.test.ts` (8) — site par défaut = principal, site explicite conservé et hérité en cascade (devis→commande→facture→avoir), repli silencieux sur le site principal si le site fourni appartient à une autre entreprise, ventilation `parSite` du dashboard, `parSite` à `null` sans la fonctionnalité (formule Essentiel).

### Rentabilité avancée

- Trois nouvelles fonctions PURES dans `profitabilityCalculationService.ts` (mêmes principes que le moteur existant — testables sans DB/API) :
  - `comparePrevisionnelVsReel` — écarts quantité/CA/bénéfice entre le prévisionnel d'une simulation et le réel. **Limite assumée et documentée dans le code** : le "bénéfice réel" est une approximation (coûts prévisionnels réappliqués au volume réel, Naatalix ne trace aucun coût réel par vente) — jamais présenté comme un chiffre exact, toujours nommé `reelApprox`.
  - `computeProfitabilityScore` — score /100 combinant 5 critères mesurables automatiquement (croissance du CA 25%, santé des créances 25%, rentabilité des simulations actives 20%, santé du stock 15%, ponctualité fournisseurs 15%). **Formule et poids proposés par défaut, non validés par la direction** — transparence assumée en contrepartie : le détail noté par critère est toujours renvoyé avec le score, jamais une boîte noire.
- Trois nouveaux endpoints dans `profitabilityController.ts`/`profitabilityRoutes.ts`, tous gatés `RENTABILITE_AVANCEE` (clé déjà existante, Pro+) :
  - `GET /simulations/:id/previsionnel-vs-reel` — ne fonctionne que pour une simulation liée à un produit du catalogue (`productId`), sinon 400 explicite (pas de rattachement automatique possible sans lien). Ventes réelles mesurées sur les factures ENVOYÉES depuis `dateLancement` (ou la création de la simulation).
  - `GET /tresorerie?semaines=&soldeActuel=` — projette encaissements (créances clients) et décaissements (dettes fournisseurs) semaine par semaine. `soldeActuel` optionnel (Naatalix ne suit aucun compte bancaire/caisse) : sans lui, seul le flux NET par semaine est significatif, pas un solde absolu.
  - `GET /score` — score de rentabilité /100 avec détail par critère.
- Tests : `src/__tests__/profitabilityCalculation.test.ts` (+11, fonctions pures), `src/__tests__/profitabilityAdvanced.test.ts` (6, intégration complète : comparaison réelle après une vraie facture envoyée, refus propre sans produit lié, trésorerie avec créance à venir + dette en retard, score borné 0-100 avec poids=100, isolation entre entreprises).

- Commandes exécutées / Résultats :
  ```
  npx tsc --noEmit && npm run build     → OK
  npx jest multisite.test.ts profitabilityAdvanced.test.ts profitabilityCalculation.test.ts → 45/45
  npm test (suite complète)             → 460/462, 1 skip (PayTech, pré-existant), 1 échec Cloudinary (pré-existant, environnemental)
  ```
  Vérifié aussi en conditions réelles sur PostgreSQL : les 4 colonnes `site_id` confirmées après migration automatique ; cycle complet testé via `curl` (facture réelle créée → dashboard `parSite` ventile bien le CA sur le site principal, score `/100` calculé sur des données réelles). Note opérationnelle : les lignes `saas_plans` de cette base de dev dataient d'avant l'ajout de `REPORTING_SITE` (même piège que documenté le 2026-09-24 — `findOrCreate` ne met jamais à jour un plan existant) — retruncaté pour reseeder, comme la fois précédente.

- Limites connues / non couvert :
  - Le "bénéfice réel" du prévisionnel vs réel reste une approximation (voir ci-dessus) — un vrai suivi de coût réel par vente serait un chantier à part (comptabilité analytique).
  - La trésorerie ne connaît aucun solde de caisse/banque réel (Naatalix n'a pas ce concept) — `soldeActuel` doit être fourni manuellement à chaque appel si un solde cumulé a un sens pour l'entreprise.
  - Le score /100 et ses poids ne sont pas validés par la direction ATAABA — à discuter si le retour terrain le justifie.
  - Assistant IA (rentabilité) explicitement écarté par l'utilisateur pour cette itération.

- Prochaine étape : au choix de l'utilisateur — SMS/WhatsApp (bloqué en attendant un prestataire), doc OpenAPI/CI/CD, ou valider/ajuster la formule du score de rentabilité avec la direction.

## Modèle d'entrée pour les prochaines étapes

### Date - Module

- Objectif :
- Fichiers ajoutés/modifiés :
- Règles métier :
- Tests ajoutés :
- Commandes exécutées :
- Résultats :
- Régressions vérifiées :
- Limites ou décisions restantes :
- Prochaine étape :
