import { Op } from 'sequelize';
import app from './app';
import sequelize from './config/database';
import { Pack } from './models/Pack';
import { Artisan } from './models/Artisan';
import { createNotification } from './services/notificationService';
import { Company } from './models/Company';
import { CompanySubscription } from './models/CompanySubscription';
import { ensureDefaultPlans, createTrialSubscription, runSubscriptionMaintenance } from './services/subscriptionService';
import { runPaymentReminders } from './services/paymentReminderService';

const PORT = process.env.PORT || 5000;
const JOUR_MS = 24 * 60 * 60 * 1000;

const DEFAULT_PACKS: Array<{
  code: 'essentiel' | 'pro' | 'business';
  nom: string;
  prixMensuel: number;
  prixAnnuel: number;
  limiteModelesActifs: number | null;
}> = [
  { code: 'essentiel', nom: 'Essentiel', prixMensuel: 3000, prixAnnuel: 30000, limiteModelesActifs: 5 },
  { code: 'pro', nom: 'Pro', prixMensuel: 7500, prixAnnuel: 75000, limiteModelesActifs: 30 },
  { code: 'business', nom: 'Business', prixMensuel: 13000, prixAnnuel: 130000, limiteModelesActifs: null },
];

// Crée les 3 packs s'ils n'existent pas encore (n'écrase jamais un pack déjà modifié depuis l'admin),
// puis rattache au pack "essentiel" les artisans déjà en base qui n'ont encore aucun pack.
async function bootstrapAbonnements() {
  for (const pack of DEFAULT_PACKS) {
    await Pack.findOrCreate({ where: { code: pack.code }, defaults: pack });
  }

  const essentiel = await Pack.findOne({ where: { code: 'essentiel' } });
  if (essentiel) {
    await Artisan.update({ packId: essentiel.id }, { where: { packId: null } });
  }
}

// Job quotidien : (1) suspend les abonnements/essais expirés, (2) alerte les artisans dont
// l'abonnement expire dans les 3 prochains jours. Pas de dépendance externe (pas de node-cron) :
// un simple setInterval suffit pour un job à cadence journalière.
async function runAbonnementDailyJob() {
  try {
    const now = new Date();

    const expires = await Artisan.findAll({
      where: {
        statutAbonnement: { [Op.in]: ['actif', 'essai'] },
        dateFinAbonnement: { [Op.lt]: now },
      },
    });
    for (const artisan of expires) {
      artisan.statutAbonnement = 'expire';
      await artisan.save();
      await createNotification(
        artisan.userId,
        'paiement',
        'Abonnement expiré',
        'Votre abonnement a expiré et votre compte a été suspendu. Renouvelez votre pack pour continuer à recevoir des commandes.',
        undefined
      );
    }

    const dansTroisJours = new Date(now.getTime() + 3 * JOUR_MS);
    const bientotExpires = await Artisan.findAll({
      where: {
        statutAbonnement: { [Op.in]: ['actif', 'essai'] },
        dateFinAbonnement: { [Op.gte]: now, [Op.lte]: dansTroisJours },
      },
    });
    for (const artisan of bientotExpires) {
      const dateFin = artisan.dateFinAbonnement as unknown as Date;
      await createNotification(
        artisan.userId,
        'paiement',
        'Abonnement bientôt expiré',
        `Votre abonnement expire le ${new Date(dateFin).toLocaleDateString()}. Renouvelez-le pour éviter une suspension.`,
        undefined
      );
    }
  } catch (error) {
    console.error('[Abonnements] Erreur lors du job quotidien :', error);
  }
}

// Phase 4 : plans par défaut + abonnement d'essai pour les entreprises créées avant l'introduction
// des abonnements (idempotent).
async function bootstrapSaas() {
  await ensureDefaultPlans();
  const companies = await Company.findAll();
  for (const company of companies) {
    const exists = await CompanySubscription.findOne({ where: { companyId: company.id } });
    if (!exists) await sequelize.transaction((t) => createTrialSubscription(company.id, t));
  }
}

async function runSaasMaintenanceJob() {
  try {
    await runSubscriptionMaintenance();
  } catch (error) {
    console.error('[Abonnements SaaS] Erreur lors du job quotidien :', error);
  }
}

// Suivi natif des paiements Naatalix (décision direction ATAABA du 2026-09-23 : autonomie vis-à-vis
// de PayTrack) : relances d'échéance/retard sur les factures.
async function runPaymentReminderJob() {
  try {
    await runPaymentReminders();
  } catch (error) {
    console.error('[Paiements] Erreur lors du job de relance quotidien :', error);
  }
}

async function runAutoMigrations() {
  const migrations = [
    // Appointments
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS lieu VARCHAR(255);`,
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS type VARCHAR(50);`,
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "proposedDate" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "motifRefus" TEXT;`,

    // Orders
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS couleur VARCHAR(50);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS taille VARCHAR(50);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS matiere VARCHAR(100);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "motifAnnulation" TEXT;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryDate" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "deliveryDateReason" VARCHAR(500);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "totalPrice" DOUBLE PRECISION;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "depositAmount" DOUBLE PRECISION;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(50) DEFAULT 'unpaid';`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customizationText" TEXT;`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "customizationPhoto" VARCHAR(255);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS "photoTissu" VARCHAR(255);`,
    `ALTER TABLE orders ADD COLUMN IF NOT EXISTS consignes TEXT;`,

    // Artisans
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS note_moyenne DOUBLE PRECISION DEFAULT 0;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS "nombreAvis" INTEGER DEFAULT 0;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS description TEXT;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS zone VARCHAR(255);`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS "photosAtelier" TEXT;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS horaires TEXT;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS "documentValidation" VARCHAR(255);`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS "motifRejet" TEXT;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS "statutAbonnement" VARCHAR(50) DEFAULT 'inactif';`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS "dateFinAbonnement" TIMESTAMP WITH TIME ZONE;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS pack_id INTEGER;`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255);`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS wave_number VARCHAR(20);`,
    `ALTER TABLE artisans ADD COLUMN IF NOT EXISTS orange_money_number VARCHAR(20);`,
    `ALTER TYPE enum_artisans_statut_abonnement ADD VALUE IF NOT EXISTS 'essai';`,

    // Users
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;`,
    `ALTER TABLE users ALTER COLUMN photo_url TYPE TEXT;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS "fcmToken" VARCHAR(255);`,

    // Creations
    `ALTER TABLE creations ADD COLUMN IF NOT EXISTS "nombreCommandes" INTEGER DEFAULT 0;`,
    `ALTER TABLE creations ALTER COLUMN photo_url TYPE TEXT;`,

    // Reviews
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "noteQualite" INTEGER;`,
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "noteDelai" INTEGER;`,
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "noteCommunication" INTEGER;`,
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "notePrix" INTEGER;`,
    `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS "noteProfessionnalisme" INTEGER;`,

    // Claims
    `ALTER TABLE claims ADD COLUMN IF NOT EXISTS "preuvePhotoUrl" VARCHAR(255);`,
    `ALTER TABLE claims ADD COLUMN IF NOT EXISTS "reponseAdmin" TEXT;`,

    // Payments (traçabilité pack + cycle des abonnements)
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS pack_id INTEGER;`,
    `ALTER TABLE payments ADD COLUMN IF NOT EXISTS cycle VARCHAR(20);`,

    // Naatalix — rattachement entreprise (table companies créée par sequelize.sync ci-dessous)
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role VARCHAR(20);`,
    `ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'entreprise';`,
    `ALTER TYPE enum_users_role ADD VALUE IF NOT EXISTS 'ataaba_staff';`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role VARCHAR(20);`,

    // Naatalix — identité documentaire (injectée dans les PDF générés)
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS coordonnees_paiement TEXT;`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS mentions_commerciales TEXT;`,
    `ALTER TABLE companies ADD COLUMN IF NOT EXISTS paytrack_actif BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE saas_plans ADD COLUMN IF NOT EXISTS features TEXT NOT NULL DEFAULT '[]';`,
    `ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS rappel_echeance_envoye BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE crm_invoices ADD COLUMN IF NOT EXISTS alerte_retard_envoyee BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(20);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_code_hash VARCHAR(255);`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_otp_expires_at TIMESTAMP WITH TIME ZONE;`,
  ];

  for (const query of migrations) {
    try {
      await sequelize.query(query);
    } catch {
      // Ignorer silencieusement si la table n'est pas encore créée (sequelize.sync la créera)
    }
  }
}

runAutoMigrations()
  .then(() => sequelize.sync({ force: false }))
  .then(() => bootstrapAbonnements())
  .then(() => bootstrapSaas())
  .then(() => runSaasMaintenanceJob())
  .then(() => runPaymentReminderJob())
  .then(() => runAbonnementDailyJob())
  .then(() => {
    console.log('[PostgreSQL] Connexion établie, migrations vérifiées et tables synchronisées.');
    setInterval(runAbonnementDailyJob, JOUR_MS);
    setInterval(runSaasMaintenanceJob, JOUR_MS);
    setInterval(runPaymentReminderJob, JOUR_MS);
    app.listen(PORT, () => {
      console.log(`[Serveur] API ModèlePro démarrée sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[PostgreSQL] Erreur de connexion fatale :', error);
  });
