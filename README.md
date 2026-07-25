# ModèlePro

Place de marché mobile mettant en relation clients et artisans (tailleurs, couturiers, artisans du textile) en Afrique de l'Ouest. Contexte sénégalais : monnaie FCFA, paiements Wave / Orange Money / Free Money.

## Structure du projet

```
modelpro/
├── modelepro-backend/   # API REST Node.js / Express / TypeScript
└── modelpro-mobile/     # Application mobile React Native / Expo
```

## Backend (`modelepro-backend`)

- **Runtime** : Node.js 20 LTS
- **Framework** : Express 5.x + TypeScript 5.4
- **ORM** : Sequelize 6 + sequelize-typescript
- **Base de données** : PostgreSQL (production) / SQLite in-memory (tests)
- **Auth** : JWT 7 jours + bcrypt
- **Tests** : Jest + Supertest

### Lancer le backend

```bash
cd modelepro-backend
cp .env.example .env   # renseigner DB_PASSWORD et JWT_SECRET
npm install
npm run dev            # http://localhost:5000/api/v1
```

### Variables d'environnement requises

```
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=modelpro
DB_USER=postgres
DB_PASSWORD=<votre_mot_de_passe>
JWT_SECRET=<clé_secrète>
```

### Tests

```bash
npm test
```

---

## Mobile (`modelpro-mobile`)

- **Framework** : React Native 0.86 + Expo SDK 57
- **Navigation** : expo-router v4 (file-based)
- **État** : Zustand + TanStack Query
- **UI** : NativeWind + expo-blur (glassmorphism) + react-native-reanimated v4
- **Formulaires** : React Hook Form + Zod

### Lancer l'application (development build)

Prérequis : Android Studio installé, téléphone connecté en USB avec débogage activé.

```bash
cd modelpro-mobile
cp .env.local.example .env.local   # renseigner EXPO_PUBLIC_API_URL
npm install --legacy-peer-deps
npx expo run:android
```

### Variables d'environnement

```
EXPO_PUBLIC_ENV=dev
EXPO_PUBLIC_API_URL=http://<IP_machine>:5000/api/v1
```

---

## Fonctionnalités

### Espace Client
- Catalogue artisans et modèles (recherche, filtres)
- Fiche artisan (profil, note, avis, catalogue)
- Prise de commande avec mesures et options
- Suivi de fabrication (timeline 7 étapes)
- Prise et gestion de rendez-vous
- Messagerie par commande (texte + photos)
- Paiements (Wave, Orange Money, Free Money, Espèces)
- Dépôt d'avis (5 critères : qualité, délai, communication, prix, professionnalisme)
- Réclamations

### Espace Artisan
- Dashboard statistiques (revenus, commandes actives, note)
- Gestion catalogue (ajout / modification / suppression de modèles)
- Réception et traitement des commandes
- Mise à jour statut fabrication + date de livraison
- Gestion des rendez-vous (confirmer / refuser / reporter)
- Profil + photos d'atelier + document de validation
- Abonnement (mensuel / annuel)

### Transversal
- Notifications push (Firebase FCM)
- Authentification JWT avec stockage sécurisé (expo-secure-store)
- Design glassmorphism avec palette inspirée des textiles africains
