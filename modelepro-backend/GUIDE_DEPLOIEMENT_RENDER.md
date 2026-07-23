# 📖 Guide Explicatif : Comment déployer le Backend & PostgreSQL sur Render.com

Ce document est un **guide de référence explicatif** décrivant toutes les étapes pour héberger l'API Backend ModèlePro et sa base de données **PostgreSQL** sur la plateforme cloud **[Render.com](https://render.com)**.

---

## 💡 Principes de Déploiement sur Render

Sur Render, une application web complète avec base de données comprend généralement **3 éléments** :

1. **La Base de Données PostgreSQL** (héberge vos tables `users`, `artisans`, `orders`, etc.).
2. **Le Web Service Node.js** (exécute votre code Express/TypeScript).
3. **Un Disque de Stockage Persistant** (conserve le dossier `/uploads` pour les images importées par les utilisateurs).

---

## 📝 Étape 1 : Préparation du Projet (sur votre ordinateur)

1. Assurez-vous que tout votre code fonctionne localement et est commité dans Git.
2. Poussez votre code sur votre dépôt distant (**GitHub** ou **GitLab**).

---

## 🗄️ Étape 2 : Créer la Base de Données PostgreSQL sur Render

1. Connectez-vous à votre espace sur **[dashboard.render.com](https://dashboard.render.com)**.
2. En haut à droite, cliquez sur **New +** ➡️ **PostgreSQL**.
3. Complétez les informations demandées :
   - **Name :** `modelepro-db` (Nom d'affichage).
   - **Database :** `modelpro` (Nom de la base de données).
   - **User :** `modelpro_user` (Nom d'utilisateur administrateur).
   - **Region :** Choisissez la région la plus proche de vos utilisateurs (ex: *Frankfurt* pour l'Europe/Afrique).
   - **Plan :** Choisissez `Free` pour démarrer gratuitement.
4. Cliquez sur **Create Database**.
5. Une fois la base créée, conservez les informations de connexion, notamment :
   - **Internal Database URL** (ex: `postgres://modelpro_user:mot_de_passe@dpg-xxx-a/modelpro`).

---

## 🖥️ Étape 3 : Créer le Service Web Node.js sur Render

1. Sur le dashboard Render, cliquez sur **New +** ➡️ **Web Service**.
2. Connectez votre compte GitHub/GitLab et sélectionnez le dépôt `modelepro-backend`.
3. Configurez les options du service :
   - **Name :** `modelepro-backend`
   - **Environment :** `Node`
   - **Region :** Même région que votre base PostgreSQL (ex: *Frankfurt*).
   - **Branch :** `main` ou `master`
   - **Build Command :** `npm install && npm run build`  
     *(Cette commande installe les paquets npm et compile le code TypeScript en JavaScript).*
   - **Start Command :** `npm start`  
     *(Cette commande démarre le serveur avec `node dist/server.js`).*

---

## 🔑 Étape 4 : Configurer les Variables d'Environnement

Dans la section **Environment Variables** de votre Web Service sur Render, ajoutez les variables suivantes :

| Variable (Key) | Exemple de Valeur (Value) | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Active le mode production de Node.js et Express |
| `PORT` | `10000` | Port d'écoute par défaut sur Render |
| `JWT_SECRET` | `votre_cle_secrete_tres_longue` | Clé utilisée pour signer et vérifier les jetons de connexion JWT |
| `DB_HOST` | `dpg-xxx-a.frankfurt-postgres.render.com` | Hôte PostgreSQL fourni par Render |
| `DB_PORT` | `5432` | Port d'écoute PostgreSQL |
| `DB_NAME` | `modelpro` | Nom de la base créée à l'étape 2 |
| `DB_USER` | `modelpro_user` | Utilisateur PostgreSQL |
| `DB_PASSWORD` | `votre_mot_de_passe_db` | Mot de passe fourni par Render |

---

## 📁 Étape 5 : Activer le Disque Persistant (Pour les uploads d'images)

Pour éviter que les photos téléchargées par les artisans et clients ne disparaissent lors des redémarrages automatiques de Render :

1. Dans votre Web Service sur Render, allez dans l'onglet **Disks**.
2. Cliquez sur **Add Disk**.
3. Renseignez :
   - **Name :** `uploads-storage`
   - **Mount Path :** `/opt/render/project/src/uploads`
   - **Size :** `1 GB` (suffisant pour démarrer).
4. Sauvegardez.

---

## 🚀 Étape 6 : Lancement et Vérification

1. Cliquez sur **Deploy / Save Changes**.
2. Render va automatiquement :
   - Télécharger votre code depuis Git.
   - Exécuter la compilation TypeScript (`npm run build`).
   - Lancer l'application (`npm start`).
   - Créer et synchroniser les tables PostgreSQL à la première connexion.
3. Dès que le statut passe à **Live** (en vert), Render vous fournit une URL HTTPS publique :
   `https://modelepro-backend.onrender.com`
4. Vous pouvez tester le bon fonctionnement dans votre navigateur :
   - `https://modelepro-backend.onrender.com/api/health` ➡️ Doit retourner `{ "status": "OK" }`.

---

## 📱 Utilisation avec les applications Frontend / Mobile

Vos développeurs Front-End et Mobile utiliseront cette URL comme racine pour toutes les requêtes :
`https://modelepro-backend.onrender.com/api/v1`
