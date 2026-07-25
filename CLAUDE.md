# ModèlePro — Stratégie de Développement Mobile

## Périmètre

Ce document couvre uniquement la partie **application mobile** (client + artisan).
Le backend est complet et documenté dans `SPEC.md`.

---

## 1. Stack recommandée

### Framework mobile

**React Native (Expo) — recommandé**

| Critère | React Native (Expo) | Flutter |
|---|---|---|
| Langage | TypeScript (même stack que le backend) | Dart |
| Vitesse de dev | Très rapide (hot reload, OTA updates) | Rapide |
| Écosystème librairies UI | Très riche (shadcn-rn, Tamagui, NativeWind) | Riche (Material, Cupertino) |
| Intégration FCM | `expo-notifications` + Firebase | `firebase_messaging` |
| Uploads fichiers | `expo-image-picker` + `expo-file-system` | `image_picker` |
| Stockage sécurisé JWT | `expo-secure-store` | `flutter_secure_storage` |
| OTA updates (sans store) | Oui (Expo EAS Update) | Non |
| Cohérence stack projet | TypeScript end-to-end | Rupture Dart |

> **Pourquoi Expo ?** Le backend est en TypeScript, les tests en Jest. Garder TypeScript sur le front réduit la charge cognitive, facilite le partage de types et de constantes (statuts, enums), et l'écosystème Expo couvre nativement FCM, les uploads et le stockage sécurisé.

---

### Librairies techniques

| Besoin | Librairie recommandée |
|---|---|
| Navigation | `expo-router` (file-based, v3) |
| Gestion d'état global | `Zustand` (léger) + `React Query (TanStack Query)` pour le cache serveur |
| HTTP client | `axios` avec intercepteur JWT |
| Formulaires | `React Hook Form` + `Zod` (validation) |
| Stockage JWT | `expo-secure-store` |
| Images / uploads | `expo-image-picker` + `expo-file-system` |
| Notifications push | `expo-notifications` + Firebase FCM |
| Dates | `date-fns` |
| Icônes | `lucide-react-native` |
| Animations | `react-native-reanimated` v3 |
| Listes performantes | `FlashList` (Shopify) |
| Bottom sheets / modals | `@gorhom/bottom-sheet` |

---

### Design system

**NativeWind v4** (Tailwind CSS pour React Native) + composants custom.

Alternativement : **Tamagui** si on veut un design system avec tokens animables.

---

## 2. Architecture du projet

### Structure des dossiers

```
modelpro-mobile/
├── app/                        # expo-router (file-based routing)
│   ├── (auth)/                 # écrans publics
│   │   ├── login.tsx
│   │   ├── register-client.tsx
│   │   └── register-artisan.tsx
│   ├── (client)/               # espace client (tab navigator)
│   │   ├── _layout.tsx
│   │   ├── index.tsx           # catalogue
│   │   ├── search.tsx
│   │   ├── artisan/[id].tsx    # profil artisan
│   │   ├── orders/
│   │   ├── appointments/
│   │   ├── messages/
│   │   ├── notifications.tsx
│   │   └── profile.tsx
│   ├── (artisan)/              # espace artisan (tab navigator)
│   │   ├── _layout.tsx
│   │   ├── dashboard.tsx
│   │   ├── orders/
│   │   ├── catalogue/
│   │   ├── appointments/
│   │   ├── messages/
│   │   └── profile.tsx
│   └── _layout.tsx             # root layout + auth guard
├── components/
│   ├── ui/                     # atomes (Button, Badge, Card, Avatar…)
│   ├── forms/                  # formulaires réutilisables
│   └── shared/                 # OrderCard, ArtisanCard, MessageBubble…
├── lib/
│   ├── api/                    # axios instance + tous les appels API
│   │   ├── client.ts           # axios avec intercepteur 401
│   │   ├── auth.ts
│   │   ├── artisans.ts
│   │   ├── orders.ts
│   │   ├── messages.ts
│   │   └── …
│   ├── store/                  # Zustand stores (auth, notifications…)
│   └── utils/                  # formatPrice, formatDate, orderStatus…
├── constants/
│   ├── api.ts                  # BASE_URL, endpoints
│   └── enums.ts                # ORDER_STATUSES, PAYMENT_TYPES… (miroir du backend)
├── hooks/                      # useAuth, useOrders, useMessages…
└── assets/
```

### Pattern de gestion des données

```
API (backend) → React Query (cache + refetch) → Zustand (état UI global) → Composants
```

- **React Query** gère le cache, la pagination, les mutations, les états loading/error
- **Zustand** gère l'état local persistant : auth token, rôle, préférences UI
- Les hooks (`useOrders`, `useMessages`…) encapsulent React Query + la logique métier

---

## 3. Design — Stratégie visuelle

### Direction artistique

Inspirée des meilleures applications Dribbble / Awwwards dans la catégorie **marketplaces artisanaux / mode africaine** :

- **Style général :** Clean, moderne, chaud — pas froid ou trop tech
- **Typographie :** Sans-serif geometric (Inter / DM Sans pour le corps, Playfair Display ou Cormorant Garamond pour les titres d'artisans/catalogue — connote le savoir-faire)
- **Couleurs :** Palette chaude ancrée dans les teintes textiles africains
  - Primaire : `#C9762B` (bronze/ocre — cuir, bazin)
  - Accent : `#1A1A2E` (bleu nuit profond)
  - Neutre clair : `#F7F4EF` (lin/ivoire)
  - Vert succès : `#2D6A4F`
  - Rouge erreur : `#C1121F`
- **Radius :** Cartes avec `rounded-2xl`, boutons `rounded-xl` — chaleureux sans être infantile
- **Ombres :** Légères, portées (pas de borders) — qualité premium
- **Iconographie :** Lucide + quelques icônes custom SVG pour les métiers

### Références design à suivre

| Inspiration | Pourquoi |
|---|---|
| **Etsy app** | Catalogue artisanal, fiche produit, messagerie contextuelle |
| **Airbnb app** | Fiche profil, système de notation, onboarding |
| **Faire (wholesale)** | Interface artisan B2B, gestion commandes |
| **Depop** | Feed visuel, recherche par style |
| Dribbble : "African marketplace UI" | Couleurs, typographie, patterns locaux |

### Composants visuels clés

#### Carte Artisan (`ArtisanCard`)
- Photo de profil ronde + badge de validation
- Nom du métier + atelier
- Note étoiles + nombre d'avis
- Zone géographique
- 3 photos d'atelier en preview horizontal

#### Carte Modèle (`ModelCard`)
- Photo principale plein cadre (ratio 4:3)
- Titre + prix estimatif en FCFA formaté
- Badge catégorie
- Nom artisan + note

#### Suivi commande (`OrderTimeline`)
- Timeline verticale avec les 7 étapes
- Étape active surlignée avec animation pulse
- Date de livraison estimée mise en avant

#### Chat commande (`ChatView`)
- Bulles photo + texte différenciées client/artisan
- Header avec résumé commande
- Zone de saisie avec bouton photo

### Principes UI/UX

1. **Mobile-first, thumb-friendly** — actions principales accessibles pouce bas
2. **Feedback immédiat** — toutes les mutations affichent un état loading + toast de confirmation
3. **Offline-aware** — React Query avec `staleTime` adapté, messages d'erreur réseau clairs
4. **Hiérarchie typographique stricte** — 3 niveaux max par écran
5. **Empty states dessinés** — pas de listes vides blanches, illustrations simples
6. **Onboarding progressif** — ne demander les permissions (notifs, galerie) qu'au moment où elles sont nécessaires

---

## 4. Phases de développement

### Phase 0 — Setup (3-5 jours)
- [ ] Init projet Expo avec TypeScript + expo-router
- [ ] Configurer NativeWind + tokens de couleur
- [ ] Configurer axios avec intercepteur 401 → redirect login
- [ ] Configurer React Query + Zustand
- [ ] Créer les constantes d'enums (miroir du backend)
- [ ] Configurer EAS Build (dev/staging/prod)

### Phase 1 — Auth & Navigation (1 semaine)
- [ ] Écrans login / inscription client / inscription artisan
- [ ] Guard de navigation selon rôle (client / artisan)
- [ ] Stockage JWT avec `expo-secure-store`
- [ ] Enregistrement token FCM au login

### Phase 2 — Espace Client — Core (2 semaines)
- [ ] Catalogue (liste + recherche + filtres)
- [ ] Fiche artisan publique (profil, note, avis, catalogue)
- [ ] Fiche modèle (photos, options, bouton commande)
- [ ] Prise de commande (formulaire mesures + options)
- [ ] Suivi commandes (`OrderTimeline`)
- [ ] Prise de RDV
- [ ] Profil client

### Phase 3 — Messagerie & Notifications (1 semaine)
- [ ] Liste des conversations
- [ ] Chat par commande (texte + photo)
- [ ] Centre de notifications
- [ ] Push notifications FCM

### Phase 4 — Espace Artisan (2 semaines)
- [ ] Dashboard stats (revenus, commandes actives, note)
- [ ] Gestion catalogue (ajout / modification / suppression modèle)
- [ ] Réception et traitement des commandes
- [ ] Mise à jour statut fabrication + date livraison
- [ ] Gestion des RDV (accepter / refuser / reporter)
- [ ] Profil artisan + upload photos atelier + document validation

### Phase 5 — Paiements & Avis (1 semaine)
- [ ] Enregistrement paiement (Wave, OM, Free Money, espèces)
- [ ] Résumé financier commande
- [ ] Abonnement artisan
- [ ] Dépôt d'avis (5 sous-notes)
- [ ] Soumission réclamation

### Phase 6 — Polish & Release (1 semaine)
- [ ] Empty states + illustrations
- [ ] Animations transitions (`react-native-reanimated`)
- [ ] Tests E2E avec Detox ou Maestro
- [ ] Accessibilité (a11y labels, contrast)
- [ ] Build EAS + soumission stores

---

## 5. Points d'attention technique

### Écarts spec ↔ backend à corriger côté client

```typescript
// Profil artisan : utiliser /profile et non /me
GET /artisans/profile   // ✅ backend réel
GET /artisans/me        // ❌ spec (ne fonctionne pas)

// Recherche artisans : utiliser /search
GET /artisans/search    // ✅ backend réel
GET /artisans           // ❌ spec (route inexistante)
```

### Intercepteur axios (auth)

```typescript
// lib/api/client.ts
axios.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('jwt')
      router.replace('/(auth)/login')
    }
    return Promise.reject(err)
  }
)
```

### Gestion des uploads

Les uploads utilisent `multipart/form-data`. Pour les photos de messages et de modèles, utiliser `expo-image-picker` + `expo-file-system` pour construire le FormData.

### Messagerie — polling

Pas de WebSocket en V1. Implémenter un polling avec React Query :
```typescript
useQuery({ queryKey: ['messages', orderId], refetchInterval: 5000 })
```
Prévoir une migration vers WebSocket/SSE en V2 sans changer l'interface des hooks.

### Types partagés

Créer `constants/enums.ts` qui miroir exactement les enums du backend :
```typescript
export const ORDER_STATUSES = ['en_attente','acceptee','en_cours','en_finition','prete','livree','annulee'] as const
export const PAYMENT_TYPES = ['acompte','solde','integral','frais_service','abonnement'] as const
export const PAYMENT_METHODS = ['wave','orange_money','free_money','especes'] as const
```

---

## 6. Environnements

```typescript
// constants/api.ts
const ENV = {
  dev: 'http://localhost:5000/api/v1',
  staging: 'https://staging-api.modelepro.com/api/v1',
  prod: 'https://api.modelepro.com/api/v1',
}
export const BASE_URL = ENV[process.env.EXPO_PUBLIC_ENV ?? 'dev']
```

Utiliser les variables d'environnement Expo (`EXPO_PUBLIC_*`) dans `.env.local`, `.env.staging`, `.env.production`.
