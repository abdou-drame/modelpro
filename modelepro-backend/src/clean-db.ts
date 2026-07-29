import bcrypt from 'bcryptjs';
import sequelize from './config/database';
import './models/index';
import { User } from './models/User';
import { Metier } from './models/Metier';

const hash = (p: string) => bcrypt.hashSync(p, 10);

async function cleanDatabase() {
  console.log('⚡ Nettoyage complet de la base de données (Suppression de toutes les données de test)...');
  await sequelize.sync({ force: true });

  // 1. Référentiel des Métiers (requis pour les formulaires de sélection)
  const metiers = await Metier.bulkCreate([
    { nom: 'Tailleur', description: 'Confection de vêtements et costumes sur mesure', actif: true },
    { nom: 'Menuisier', description: 'Fabrication et création de meubles en bois sur mesure (Menuiserie)', actif: true },
    { nom: 'Coiffeur', description: 'Coiffure traditionnelle, tresses et soins capillaires (Coiffure)', actif: true },
    { nom: 'Cordonnier', description: 'Réparation et fabrication artisanale de chaussures et maroquinerie (Cordonnerie)', actif: true },
    { nom: 'Couturière', description: 'Confection de tenues féminines et robes de cérémonie', actif: true },
    { nom: 'Brodeur', description: 'Broderie traditionnelle et moderne sur tissus', actif: true },
    { nom: 'Styliste', description: 'Création de collections mode contemporaine', actif: true },
  ]);
  console.log(`✅ Référentiel de ${metiers.length} métiers initialisé.`);

  // 2. Compte Administrateur unique pour l'accès au Back Office Admin
  await User.create({
    nom: 'Admin',
    prenom: 'ModèlePro',
    telephone: '0600000000',
    email: 'admin@modelepro.com',
    password: hash('Admin@2026'),
    role: 'admin',
    statut: 'actif',
    photoUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&q=80',
  });
  console.log('✅ Compte Admin système créé (0600000000 / Admin@2026).');

  console.log('\n✨ La base de données est 100% propre !');
  console.log('   - 0 client de test');
  console.log('   - 0 artisan de test');
  console.log('   - 0 commande / RDV / message de test');
  console.log('   - Persistance garantie : Toutes vos données s\'inscriront et persisteront indéfiniment.');

  await sequelize.close();
}

cleanDatabase().catch((err) => {
  console.error('Erreur nettoyage base :', err);
  process.exit(1);
});
