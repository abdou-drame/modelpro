# 📱 Guide de Lancement — ModèlePro Mobile

Ce document récapitule tout ce dont l'application mobile React Native (Expo) a besoin pour fonctionner, et comment la lancer sur **Web** ou sur un **Téléphone Portable**.

---

## ⚡ RÈGLE D'OR : Le Backend doit être démarré !

Pour que l'application mobile (sur Web ou Téléphone) puisse afficher les artisans, modèles, connexions et commandes, **le Backend Express/PostgreSQL doit impérativement être démarré**.

Dans un **Terminal 1** :
```bash
cd modelepro-backend
npm run dev
```
*(Le backend tourne sur `http://localhost:5000`)*

---

## 🌐 1. Lancer l'application sur le WEB

Dans un **Terminal 2** :
```bash
cd modelpro-mobile
npx expo start --web
```
L'application s'ouvre automatiquement dans votre navigateur sur `http://localhost:8081`.

---

## 📱 2. Lancer l'application sur votre TÉLÉPHONE PORTABLE

### Étape 1 : Télécharger l'application Expo Go
- **Android :** Téléchargez [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) sur le Play Store.
- **iPhone (iOS) :** Téléchargez [Expo Go](https://apps.apple.com/app/expo-go/id982107779) sur l'App Store.

### Étape 2 : Lancer avec le Mode Tunnel (Recommandé)
Dans un **Terminal 2** :
```bash
cd modelpro-mobile
npx expo start --tunnel
```
*Le mode tunnel génère une URL sécurisée universelle qui fonctionne sur n'importe quel Wi-Fi ou même en 4G/5G.*

### Étape 3 : Scanner le QR Code
1. Un **QR Code** s'affiche dans votre terminal.
2. **Sur Android :** Ouvrez l'application **Expo Go**, appuyez sur *"Scan QR Code"* et scannez.
3. **Sur iPhone :** Ouvrez l'application **Appareil Photo** native, pointez vers le QR Code et appuyez sur la bannière Expo Go.

---

## 💬 3. Messagerie & Notifications Push (Firebase FCM)

### 📩 A. Fonctionnement de la Messagerie dans l'application Mobile
- **Stockage & API :** Tous les messages envoyés entre Client et Artisan passent par les routes API du Backend (`/api/v1/messages/order/:orderId`).
- **Actualisation automatique (Polling V1) :** Dans la vue de discussion (`ChatView`), le hook React Query rafraîchit automatiquement la conversation toutes les 5 secondes (`refetchInterval: 5000`) pour afficher les nouveaux messages en temps réel.
- **Envoi de photos :** Les photos d'illustrations dans le chat utilisent `expo-image-picker` et sont transmises sous forme de `multipart/form-data`.

### 🔔 B. Fonctionnement des Notifications Push Firebase (FCM)
1. **Demande de permission au démarrage :**
   - L'application mobile utilise la librairie `expo-notifications` pour demander la permission à l'utilisateur de lui envoyer des notifications.
2. **Obtention et Enregistrement du Token FCM :**
   - Lorsqu'un utilisateur (Client ou Artisan) se connecte, l'application récupère son jeton unique de téléphone (`fcmToken`).
   - L'application envoie ce jeton au backend via l'API : `POST /api/v1/users/fcm-token`.
   - Le backend enregistre ce jeton dans la table `users` (colonne `fcm_token`).
3. **Déclenchement des Push Notifications :**
   - Dès qu'un événement survient (ex: nouveau message reçu, statut de commande mis à jour à *'prête'*, RDV accepté), le backend utilise le SDK **Firebase Admin** pour envoyer une notification Push instantanée au téléphone du destinataire.
4. **Réception et Navigation :**
   - Le téléphone affiche la bannière de notification.
   - En cliquant sur la notification, `expo-router` redirige automatiquement l'utilisateur vers l'écran correspondant (ex: la commande ou la conversation spécifique).

---

## ⚙️ 4. Récapitulatif des commandes

| Action | Commande |
|---|---|
| Démarrer le Backend | `cd modelepro-backend` puis `npm run dev` |
| Lancer le Mobile sur Web | `cd modelpro-mobile` puis `npx expo start --web` |
| Lancer le Mobile sur Téléphone | `cd modelpro-mobile` puis `npx expo start --tunnel` |
| Vider le cache Expo | `npx expo start -c` |
