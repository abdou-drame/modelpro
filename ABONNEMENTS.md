# Abonnements artisans — Packs Essentiel / Pro / Business

## Pourquoi ce chantier

Aujourd'hui, l'abonnement artisan dans ModèlePro est un simulacre : un simple flag `actif/inactif/expire` sans notion de pack, activé manuellement par l'admin avec un paiement fixe de 5000 FCFA. Il n'y a ni prix réel, ni limite de modèles, ni essai gratuit, ni renouvellement automatique. Ce chantier remplace ce simulacre par un vrai modèle économique récurrent.

## Ce que ça apporte au projet

- **Un revenu récurrent réel et prévisible** : 3 paliers (Essentiel 3 000 / Pro 7 500 / Business 13 000 FCFA/mois, ou en tarif annuel réduit) au lieu d'un abonnement fictif à montant unique.
- **Un vrai levier de croissance (upsell)** : un artisan limité à 5 modèles actifs sur Essentiel a une raison concrète de passer à Pro (30) ou Business (illimité) — ce mécanisme d'incitation n'existe pas aujourd'hui.
- **Un auto-service complet pour l'artisan** : il configure lui-même son compte (logo, coordonnées, numéros Wave/Orange Money, catalogue de modèles) sans intervention de l'équipe — gratuit en autonome, avec une option payante (10 000 FCFA) d'accompagnement par ATAABA pour ceux qui préfèrent être assistés.
- **Moins de comptes fantômes / impayés** : essai gratuit de 14 jours cadré dans le temps, alertes avant expiration, puis suspension automatique en cas de non-renouvellement — remplace le statut `actif` qui aujourd'hui ne se corrige jamais tout seul.
- **Un pilotage réel côté admin** : tableau de bord des inscriptions, abonnements et paiements par pack, avec limites de chaque pack modifiables directement depuis l'administration (pas de déploiement nécessaire pour ajuster un prix ou une limite).
- **Corrige un bug latent au passage** : le calcul actuel de durée d'abonnement devine la durée à partir du montant payé (`>= 40 000 FCFA → 365 jours, sinon 30 jours`). Avec les nouveaux prix, un abonnement Essentiel annuel à 30 000 FCFA tomberait sous ce seuil et ne recevrait que 30 jours au lieu de 365 — ce chantier remplace ce heuristique par un calcul basé sur le pack et le cycle choisis explicitement.

## Phases (voir suivi dans la conversation / TodoWrite)

1. ✅ **Modèle de données backend** — table `Pack` (prix, limites, éditable admin), champs `packId`/`waveNumber`/`orangeMoneyNumber`/`logoUrl` sur `Artisan`, statut `essai` ajouté à `statutAbonnement`, backfill des artisans existants.
2. ✅ **Logique métier backend** — calcul de durée basé sur pack+cycle (plus sur le montant deviné), essai gratuit 14 jours, alertes avant expiration + suspension automatique (job planifié), contrôle de quota de modèles actifs, changement de pack.
3. ✅ **Admin** — page de gestion des packs (prix/limites), dashboard enrichi (répartition par pack, essais en cours, suspensions).
4. ✅ **Mobile (espace artisan)** — écran d'abonnement (3 packs × 2 cycles, bannière essai/expiration, changement de pack), champs logo + Wave/Orange Money dans le profil.

Toutes les phases livrées le 2026-08-07. Vérifications : 105/105 tests backend, `tsc --noEmit` propre sur les 3 apps, build de production admin réussi, bundling web mobile sans erreur.

**Reste hors périmètre (non demandé pour l'instant)** : configuration assistée ATAABA (10 000 FCFA), PayTrack.

---

## Récapitulatif détaillé des améliorations et où les vérifier

### Backend (API — pas d'interface propre, vérifiable via les apps ci-dessous ou directement en HTTP)

| Amélioration | Détail |
|---|---|
| Table `Pack` | Essentiel / Pro / Business, prix mensuel+annuel, limite de modèles, actif/inactif. Créée et remplie automatiquement au démarrage du serveur. |
| Artisan enrichi | Nouveaux champs `packId`, `logoUrl`, `waveNumber`, `orangeMoneyNumber` ; nouveau statut `essai` (en plus de inactif/actif/expire). |
| Calcul du paiement d'abonnement corrigé | Avant : durée devinée selon le montant (bug avec les nouveaux prix). Maintenant : basé sur le pack + cycle choisis explicitement. |
| Essai gratuit 14 jours | Démarre automatiquement à la validation du compte artisan par l'admin. |
| Quota de modèles | Bloque l'ajout d'un nouveau modèle si la limite du pack est atteinte. |
| Alertes + suspension automatique | Job quotidien : notifie 3 jours avant expiration, suspend automatiquement si non renouvelé. |
| Nouveaux endpoints | `GET /packs` (public), `PUT /artisans/pack` (changer de pack), `POST /artisans/logo` (upload logo), `GET/PUT /admin/packs` (gestion admin). |

### Interface Admin (`modelpro-admin`, http://localhost:3001)

| Où | Ce que tu y vois |
|---|---|
| **Menu latéral → "Packs"** (nouvelle page, icône calques) | Liste des 3 packs avec prix mensuel/annuel, limite de modèles, statut actif/inactif. Bouton "Modifier" sur chaque ligne → formulaire pour changer les prix/limites sans toucher au code. |
| **Dashboard (page d'accueil)** | 2 nouvelles tuiles dans les KPI secondaires : "Essais en cours" et "Comptes suspendus". Nouvelle rangée de graphiques en bas : "Répartition par pack" (barres) et "Suivi des abonnements" (essais / actifs / suspendus). |

### Interface Mobile artisan (`modelpro-mobile`, espace Artisan)

| Où | Ce que tu y vois |
|---|---|
| **Profil → "Abonnement ModèlePro"** (bouton avec icône couronne) | Écran refait : les 3 packs côte à côte avec prix, bascule Mensuel/Annuel, bannière de statut (essai / actif / expiré), choix du moyen de paiement, bouton "Payer et activer", et un bouton secondaire "Changer de pack sans payer maintenant" si un autre pack est sélectionné. Historique des paiements en bas. |
| **Profil → carte "Informations de l'atelier"** | Nouveau bloc logo en haut de la carte (photo carrée + bouton pour changer). Deux nouveaux champs en bas du formulaire : "Numéro Wave" et "Numéro Orange Money". |

Pour tout tester en conditions réelles : backend sur http://localhost:5000, admin sur http://localhost:3001, mobile web sur http://localhost:8081 — les trois tournaient déjà en arrière-plan pendant ce travail.
