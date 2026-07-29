# ModèlePro Project Rules & Permanent Memory

## 1. Global Database Persistence (CRITICAL)
- **NEVER** use `sequelize.sync({ force: true })` during server startup or standard seed scripts.
- **ALWAYS** use `sequelize.sync({ force: false })` to guarantee that all user-registered data (clients, artisans, admins, orders, appointments, messages, claims, reviews) persists permanently on disk across server restarts, server crashes, PC reboots, or re-running scripts.
- Data seeding (`npm run seed`) MUST be non-destructive (`force: false` + `findOrCreate` or checking `existingCount === 0`) so running seeds NEVER drops tables or erases registered accounts.

## 2. Sequelize Model Schema Rules (CRITICAL)
- **Artisan Model**: Does NOT have `createdAt` or `updatedAt` columns (`timestamps: false`). ALWAYS order `Artisan` queries by `id` or `noteMoyenne` (`order: [['id', 'DESC']]`). NEVER order `Artisan` by `createdAt` as it triggers PostgreSQL error `42703 (la colonne Artisan.createdAt n'existe pas)`.
- **Creation & User Includes**: Set `required: false` on `Artisan` and `User` includes when listing models/creations so that all catalog items render cleanly even if user attributes are null or pending.

## 3. React Native Web DOM Nesting (CRITICAL)
- **NEVER** nest a `<TouchableOpacity>` or `<Pressable>` inside another `<TouchableOpacity>` or `<Pressable>`.
- In React Native Web, `TouchableOpacity` renders as an HTML `<button>` element. Nesting buttons triggers React DOM errors: `validateDOMNesting(...): <button> cannot appear as a descendant of <button>`.
- Always wrap outer card containers in `<View>` and keep inner interactive elements as sibling elements or separate Touchables.

## 4. End-to-End Core Workflows & Admin Features
- **Artisan Management**:
  - Registration -> `statutValidation: 'en_attente'`.
  - Admin Back Office (`/artisans`) -> Validates (`'valide'`) or Rejects (`'rejete'`).
  - Admin can **Suspend** (`/artisans/:id/suspend` -> `user.statut = 'suspendu'`) or **Reactivate** (`/artisans/:id/reactivate` -> `user.statut = 'actif'`).
  - Suspended artisans are automatically hidden from client search & catalogue (`statut: 'actif'`).
- **Client Orders & Cancellation**:
  - Client creates order -> Visible in Artisan Dashboard and Admin Back Office.
  - Client cancels order -> `statut: 'annulee'`.
  - Artisan **keeps order visible** in dashboard with badge 🔴 "Annulée".
  - Admin **filters out cancelled orders by default** (`includeAnnulees=false`), but can view them if requested.
- **Appointments & Rescheduling / Cancellation**:
  - Artisan can reschedule appointment (`/artisans/appointments/:id/reschedule` -> `statut: 'reporte'`).
  - Client can cancel appointment (`PATCH /appointments/:id/cancel` -> `statut: 'annule'`).
  - Notification sending MUST be safely wrapped in `try/catch` in ALL appointment endpoints (`updateAppointmentStatus`, `rescheduleAppointment`, `cancelAppointment`) to ensure action NEVER fails due to push/ENUM issues.
- **Reviews & Moderation**:
  - Client posts review -> Updates artisan `noteMoyenne` and `nombreAvis`.
  - Admin can view all reviews in central **⭐ Avis** page (`/reviews`) and inside Artisan Profile (`/artisans/:id`).
  - Admin deletes review -> Permanently deleted and artisan average rating / review count is automatically recalculated.
- **User Deletion**:
  - Admin deletes user (`DELETE /admin/users/:id`) -> Permanently removed and login blocked.
- **Search & Filters**:
  - Client Mobile: Filter by price min/max, name/model/artisan, location, métier.
  - Admin Back Office: Search input bar for Users, Artisans, Orders, and Reviews.

## 5. Front-End Null Safety & Defensive Props (CRITICAL)
- **ALWAYS** use optional chaining and fallback defaults when dereferencing nested relations in React & React Native components (e.g., `model.artisan?.atelier ?? 'Atelier'`, `model.artisan?.métier ?? 'Création'`, `review.client?.prenom ?? ''`).
- **NEVER** assume nested relations (`artisan`, `user`, `client`, `creation`) are non-null. Dereferencing `model.artisan.atelier` directly without `?.` causes uncaught crashes (`Cannot read properties of null (reading 'atelier')`).

## 6. Action Confirmation & Feedback (CRITICAL)
- **ALWAYS** display an explicit confirmation popup/alert (`Alert.alert` or modal) upon completing key user actions (e.g. "Envoyer la commande", "Signaler / Réclamation", "Demander un RDV", "Publier un avis", "Annuler une commande").
- Ensure the user receives clear, immediate feedback confirming their action before or during screen navigation.

## 7. Session Auth Persistence & Role Guarding (CRITICAL)
- **Session Syncing (`loadFromStorage`)**: `useAuthStore.loadFromStorage()` MUST always verify `/users/me` from backend upon page reload/refresh to guarantee the exact user profile & role (`client` or `artisan`), preventing stale browser storage role cross-contamination.
- **Strict Role Guarding (`AuthGuard` in `_layout.tsx`)**: Enforce strict route access by user role. A `client` user accessing `(artisan)` routes is automatically redirected to `(client)`, and an `artisan` user accessing `(client)` routes is redirected to `(artisan)/dashboard`.

## 8. React Native Web Alert Compatibility (CRITICAL)
- **ALWAYS** use the `showAlert` helper (`@/lib/utils/alert`) instead of raw `Alert.alert` when multi-button confirmation dialogs are needed in mobile app screens.
- In React Native Web, `Alert.alert` does NOT execute `onPress` callbacks for secondary/cancel buttons because standard browser `window.alert` only renders a single OK button. `showAlert` uses `window.confirm` on Web to guarantee that button callbacks (`Confirmer`, `Annuler`, `Reporter`) execute reliably on Web browsers.



