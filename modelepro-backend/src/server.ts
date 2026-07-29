import app from './app';
import sequelize from './config/database';

const PORT = process.env.PORT || 5000;

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
    `ALTER TABLE claims ADD COLUMN IF NOT EXISTS "reponseAdmin" TEXT;`
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
  .then(() => {
    console.log('[PostgreSQL] Connexion établie, migrations vérifiées et tables synchronisées.');
    app.listen(PORT, () => {
      console.log(`[Serveur] API ModèlePro démarrée sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[PostgreSQL] Erreur de connexion fatale :', error);
  });
