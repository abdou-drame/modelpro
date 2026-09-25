# Naatalix - Roadmap Backend

## 1. Objectif du document

Ce document organise la transformation progressive du backend ModèlePro en backend Naatalix, sans casser les fonctionnalités existantes.

Naatalix sera un ERP + CRM SaaS multi-entreprises, multi-utilisateurs et API-first. Le développement se fera module par module, dans l'ordre suivant :

1. sécurisation et fondations ;
2. CRM ;
3. ERP commercial ;
4. rentabilité et pilotage ;
5. abonnements, intégrations et back-office ATAABA ;
6. durcissement, performance et mise en production.

Le cahier des charges de référence est `Cahier_des_charges_Naatalix_ATAABA.docx`. Le module de rentabilité est décrit dans `Cahier_des_charges_Module_Naatalix_Rentabilite.docx`.

## 2. Règles de développement

- Ne pas supprimer ni renommer brutalement les routes et modèles ModèlePro déjà utilisés.
- Ajouter les nouveaux domaines dans des modules séparés et clairement nommés.
- Toute nouvelle donnée métier Naatalix doit être rattachée à une organisation (`tenant/company`) dès que le module multi-entreprise est en place.
- Toute opération sensible doit vérifier l'authentification, le rôle, l'organisation et les permissions.
- Les calculs financiers doivent être dans des services testables, indépendants des contrôleurs HTTP.
- Les paiements Naatalix restent séparés de PayTrack : Naatalix gère les factures et les statuts métier ; PayTrack exécute le paiement lorsqu'il est connecté.
- Une migration de données doit être versionnée, testée et réversible autant que possible.
- Aucun module n'est considéré terminé sans tests, documentation et vérification de non-régression.

## 3. État de départ vérifié

### Stack existante

- Node.js, Express 5 et TypeScript.
- Sequelize avec PostgreSQL en environnement normal.
- SQLite en mémoire pour les tests.
- JWT et bcrypt pour l'authentification.
- Jest + Supertest pour les tests API.
- Routes versionnées sous `/api/v1`.

### Modules ModèlePro existants

- utilisateurs, clients et artisans ;
- métiers et catalogue ;
- commandes ;
- rendez-vous ;
- paiements ;
- notifications ;
- messagerie ;
- avis et réclamations ;
- abonnements artisan et portefeuille selon le code existant.

### Point de contrôle initial obligatoire

Avant le premier module Naatalix, exécuter depuis `modelepro-backend` :

```powershell
npm test
npm run build
```

Le résultat doit être enregistré dans `JOURNAL.md`. En cas d'échec, corriger ou documenter la cause avant d'ajouter une fonctionnalité Naatalix.

## 4. Méthode de livraison par module

Chaque module suit toujours le même cycle :

1. **Cadrage** : objectifs, acteurs, données, règles métier et routes prévues.
2. **Audit local** : vérifier les modèles, middlewares, contrôleurs et tests réutilisables.
3. **Conception** : définir les tables, relations, statuts, permissions et contrats API.
4. **Implémentation** : modèles, services métier, contrôleurs, routes et validations.
5. **Tests unitaires** : règles métier, calculs, statuts et permissions.
6. **Tests d'intégration** : API réelle avec SQLite de test et relations Sequelize.
7. **Tests de non-régression** : suite ModèlePro complète.
8. **Build TypeScript** : vérifier les types et les imports.
9. **Revue manuelle** : vérifier isolation tenant, erreurs, pagination, autorisations et cohérence des statuts.
10. **Journalisation** : inscrire ce qui a été ajouté, les commandes lancées, les résultats et les limites connues dans `JOURNAL.md`.

Une fonctionnalité qui échoue à une étape reste en cours et ne doit pas être déclarée terminée.

## 5. Phase 0 - Fondations et sécurisation

### Objectif

Préparer la base sans modifier le comportement métier stable de ModèlePro.

### Travaux

- faire l'inventaire précis des modèles, routes, contrôleurs, services et dépendances ;
- identifier les routes et modèles exclusivement ModèlePro ;
- corriger les secrets par défaut et vérifier la configuration par environnement ;
- centraliser les erreurs et les réponses API si cela peut être fait sans régression ;
- définir les conventions de validation, pagination, statuts et identifiants ;
- préparer les migrations Sequelize ou une stratégie de synchronisation contrôlée ;
- définir la stratégie `tenant_id/company_id` ;
- documenter les rôles et permissions existants avant de les étendre ;
- créer des tests de référence pour l'authentification et l'accès aux routes existantes.

### Validation

- tests ModèlePro passants ;
- build passant ;
- les routes existantes répondent comme avant ;
- aucun secret de production n'est codé en dur ;
- la stratégie d'isolation des entreprises est validée avant création des données Naatalix.

## 6. Phase 1 - CRM, priorité 1

Le CRM vient avant l'ERP car il représente le début du parcours commercial.

### 1. Organisation et utilisateurs

Créer le contexte entreprise :

- `companies` ou `tenants` ;
- paramètres, identité et informations légales ;
- utilisateurs rattachés à une entreprise ;
- rôles et permissions ;
- sites/agences si nécessaires ;
- journal d'activité.

**Critères de validation :** un utilisateur du tenant A ne peut ni lire ni modifier les données du tenant B ; les actions sensibles sont bloquées selon le rôle.

### 2. Clients, prospects et contacts

Créer :

- fiche prospect ;
- fiche client ;
- contacts liés à une organisation ;
- conversion prospect vers client ;
- segmentation, notes, documents et historique ;
- recherche et détection de doublons.

**Critères de validation :** création, modification, recherche, conversion et historique testés ; aucune donnée ne traverse les tenants.

### 3. Opportunités et pipeline commercial

Créer :

- opportunité ;
- étapes configurables ;
- valeur potentielle ;
- probabilité ;
- commercial responsable ;
- prochaine action ;
- date prévue ;
- prévision de chiffre d'affaires.

**Critères de validation :** pipeline filtrable, calcul de prévision cohérent et permissions respectées.

### 4. Tâches, relances et rendez-vous CRM

Étendre ou adapter les rendez-vous existants sans casser ceux de ModèlePro :

- tâches commerciales ;
- rappels ;
- prochaines actions ;
- rendez-vous liés à un prospect, client ou opportunité ;
- historique des changements.

**Critères de validation :** création, assignation, report, annulation, rappels et historique testés.

### 5. Catalogue CRM

Faire évoluer le catalogue pour accepter :

- produit physique ;
- service/prestation ;
- catégorie ;
- prix ;
- taxe paramétrable ;
- statut actif/inactif ;
- disponibilité ;
- variantes simples si nécessaires.

Les créations artisanales existantes doivent continuer à fonctionner pendant la transition.

**Critères de validation :** les produits/services sont utilisables dans le futur devis sans régression sur les modèles ModèlePro.

### Fin de phase CRM

Le CRM est validé quand le parcours suivant fonctionne :

`Prospect -> Opportunité -> Client -> Prochaine action`

## 7. Phase 2 - ERP commercial, priorité 2

### 1. Devis

Créer les devis et leurs lignes :

- numérotation par entreprise ;
- client et contact ;
- produits/services ;
- quantités, prix, remises et taxes ;
- totaux ;
- validité ;
- brouillon, envoyé, accepté, refusé, expiré ;
- génération PDF ;
- acceptation et conversion en commande.

**Critère principal :** un devis accepté devient une commande sans ressaisie des lignes.

### 2. Commandes commerciales

Faire coexister les commandes Naatalix avec les commandes artisanales existantes ou définir une abstraction commune propre :

- commande client ;
- lignes ;
- statut et historique ;
- exécution/livraison/prestation ;
- conversion depuis devis ;
- lien vers facture.

**Critère principal :** aucune régression sur `orders` et chaque transition de statut est contrôlée.

### 3. Facturation et règlements

Créer :

- factures et lignes ;
- numérotation ;
- échéances ;
- taxes ;
- avoir simple ;
- payé, partiellement payé, impayé ;
- solde restant ;
- règlements manuels ;
- reçus et relevés clients.

**Critère principal :** un paiement partiel puis le solde recalculent correctement les montants et le statut.

### 4. Fournisseurs et achats

Créer :

- fournisseurs ;
- contacts fournisseurs ;
- produits fournis ;
- prix et conditions ;
- commandes fournisseurs ;
- échéances ;
- historique et soldes.

**Critère principal :** une commande fournisseur est isolée par entreprise et son historique est consultable.

### 5. Stocks

Créer :

- stock par produit et site ;
- entrée ;
- sortie ;
- ajustement ;
- inventaire ;
- seuil d'alerte ;
- valorisation simple ;
- lien avec achats et commandes.

**Critère principal :** aucune sortie ne crée un stock négatif sans permission explicite.

### 6. Documents et exports

Ajouter progressivement :

- devis PDF ;
- facture PDF ;
- reçu ;
- bon de commande ;
- bon de livraison ;
- relevé client ;
- export CSV/Excel selon les droits.

**Critère principal :** logo, identité et mentions de l'entreprise sont injectés et les documents respectent les permissions.

### Fin de phase ERP

Le parcours ERP minimum est validé quand celui-ci fonctionne :

`Prospect -> Devis -> Commande -> Facture -> Paiement -> Reçu`

## 8. Phase 3 - Pilotage et rentabilité

Cette phase vient après la fiabilisation des ventes, achats, stocks, dépenses et règlements.

### Module rentabilité

Créer les services de calcul avant l'interface :

- coûts fixes et variables ;
- coût variable unitaire ;
- coût complet ;
- bénéfice unitaire ;
- taux de marge et taux de marque ;
- prix plancher, recommandé et premium ;
- seuil de rentabilité et point mort ;
- objectif de bénéfice ;
- scénarios prudent, réaliste et optimiste ;
- analyse de sensibilité ;
- simulation de remises ;
- ROI et investissement initial ;
- prévisionnel contre réel ;
- score et statut de rentabilité ;
- historique, versioning, duplication et comparaison ;
- alertes et recommandations.

**Règle :** les recommandations ne modifient jamais automatiquement les données financières.

### Dashboard

Ajouter les indicateurs :

- CA ;
- ventes ;
- panier moyen ;
- clients et conversion ;
- pipeline ;
- facturé, encaissé, impayé ;
- stock faible ;
- achats ;
- top produits/services ;
- marge et bénéfice ;
- prévisionnel/réel.

**Critère principal :** les indicateurs sont filtrables par période et cohérents avec les transactions réelles.

## 9. Phase 4 - Abonnements, PayTrack et back-office ATAABA

### Abonnements SaaS

- plans ;
- essai ;
- activation ;
- quotas ;
- renouvellement ;
- suspension contrôlée ;
- historique ;
- notifications d'expiration.

### PayTrack

- créer une facture dans Naatalix ;
- envoyer montant, devise et référence à PayTrack ;
- recevoir un webhook ;
- vérifier l'authenticité ;
- traiter l'événement de manière idempotente ;
- mettre à jour le règlement et le solde ;
- journaliser les deux côtés.

Naatalix doit fonctionner sans PayTrack avec des règlements manuels.

### Back-office ATAABA

- entreprises ;
- abonnements ;
- métriques d'utilisation ;
- support et incidents ;
- intégrations ;
- erreurs techniques ;
- supervision ;
- audit renforcé.

## 10. Phase 5 - Qualité, sécurité et production

- tests de sécurité et isolation tenant ;
- contrôle RBAC sur chaque endpoint sensible ;
- limitation de débit ;
- validation stricte des entrées ;
- logs structurés et identifiant de corrélation ;
- sauvegardes chiffrées et restauration testée ;
- contrôle d'accès aux fichiers ;
- pagination et traitement asynchrone des exports/PDF ;
- documentation OpenAPI/Swagger ;
- CI/CD et environnements dev/test/production ;
- test de charge des listes, dashboards et exports ;
- recette métier avec données anonymisées.

## 11. Stratégie anti-régression

Avant chaque module :

```powershell
cd modelepro-backend
npm test
npm run build
```

Après chaque module :

```powershell
npm test
npm run build
```

En plus, chaque module doit contenir :

- tests unitaires des règles métier ;
- tests d'intégration des routes ;
- test d'accès sans token ;
- test d'accès avec mauvais rôle ;
- test d'isolation entre deux entreprises dès que le multi-tenant existe ;
- test des erreurs de validation ;
- test du scénario nominal ;
- test de régression sur les fonctionnalités ModèlePro concernées.

Les tests doivent utiliser le comportement réel de l'API et de la base SQLite de test. Il faut éviter les tests qui vérifient uniquement des mocks sans prouver le résultat métier.

## 12. Definition of Done

Un module est terminé seulement si :

- ses règles métier sont écrites ;
- son schéma et ses relations sont documentés ;
- ses routes sont protégées ;
- ses contrôleurs délèguent la logique aux services ;
- ses erreurs sont gérées ;
- ses tests unitaires et intégration passent ;
- la suite complète ModèlePro passe ;
- `npm run build` passe ;
- les données restent isolées par entreprise ;
- les changements sont inscrits dans `JOURNAL.md` ;
- la documentation API est mise à jour ;
- les limites restantes sont explicitement notées.

## 13. Ordre de démarrage recommandé

1. établir le résultat de référence avec les tests et le build ;
2. auditer `User`, l'authentification et les permissions ;
3. ajouter `Company/Tenant` et l'affectation des utilisateurs ;
4. ajouter clients, prospects et contacts ;
5. ajouter opportunités et pipeline ;
6. ajouter tâches et rendez-vous CRM ;
7. adapter le catalogue produit/service ;
8. seulement ensuite commencer devis, commandes et factures ;
9. ajouter achats et stocks ;
10. ajouter rentabilité et dashboards ;
11. terminer par abonnements, PayTrack et back-office ATAABA.

Chaque étape doit être validée et journalisée avant de passer à la suivante.
