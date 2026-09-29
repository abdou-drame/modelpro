import sequelize from './config/database';
import './models/index';
import { User } from './models/User';
import { hashPassword } from './utils/auth';

// Création du PREMIER superadmin ATAABA (les suivants se créent via l'API du back-office).
// Il n'existe volontairement aucune route publique pour créer du personnel ATAABA.
//   STAFF_TELEPHONE=... STAFF_PASSWORD=... [STAFF_NOM=... STAFF_PRENOM=...] npm run staff:create
const run = async () => {
  const telephone = process.env.STAFF_TELEPHONE;
  const password = process.env.STAFF_PASSWORD;
  if (!telephone || !password) {
    console.error('STAFF_TELEPHONE et STAFF_PASSWORD sont requis.');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error('Le mot de passe doit contenir au moins 10 caractères.');
    process.exit(1);
  }

  await sequelize.sync();
  const existing = await User.findOne({ where: { telephone } });
  if (existing) {
    console.error('Un compte existe déjà avec ce numéro de téléphone.');
    process.exit(1);
  }

  const staff = await User.create({
    nom: process.env.STAFF_NOM || 'ATAABA',
    prenom: process.env.STAFF_PRENOM || 'Admin',
    telephone,
    password: await hashPassword(password),
    role: 'ataaba_staff',
    statut: 'actif',
    platformRole: 'superadmin',
  });
  console.log(`Superadmin ATAABA créé (id ${staff.id}).`);
  await sequelize.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
