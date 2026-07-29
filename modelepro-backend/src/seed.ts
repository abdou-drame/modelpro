import bcrypt from 'bcryptjs';
import sequelize from './config/database';
import '../src/models/index';
import { User } from './models/User';
import { Client } from './models/Client';
import { Artisan } from './models/Artisan';
import { Metier } from './models/Metier';
import { Creation } from './models/Creation';
import { Order } from './models/Order';
import { Message } from './models/Message';
import { Appointment } from './models/Appointment';
import { Review } from './models/Review';
import { Payment } from './models/Payment';
import { Notification } from './models/Notification';
import { Claim } from './models/Claim';

const hash = (p: string) => bcrypt.hashSync(p, 10);

const PHOTOS_ARTISAN = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
  'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80',
];

const PHOTOS_ATELIER = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80',
  'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=800&q=80',
  'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800&q=80',
  'https://images.unsplash.com/photo-1612817288484-6f916006741a?w=800&q=80',
];

const PHOTOS_CREATION = [
  'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
  'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&q=80',
  'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=600&q=80',
  'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80',
  'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=600&q=80',
  'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=600&q=80',
  'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80',
  'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&q=80',
  // Menuiserie
  'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=600&q=80',
  'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=80',
  // Coiffure
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
  'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&q=80',
  // Cordonnerie
  'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80',
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&q=80',
];

const PHOTOS_CLIENT = [
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=300&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=300&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=300&q=80',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=300&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=300&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&q=80',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=300&q=80',
];

async function seed() {
  const force = process.argv.includes('--force') || process.argv.includes('--reset');
  await sequelize.sync({ force });
  console.log(force ? 'Base de données réinitialisée.' : 'Base de données synchronisée (mode persistant).');

  const existingCount = await User.count();
  if (existingCount > 0 && !force) {
    console.log(`[Persistance] ${existingCount} utilisateurs déjà enregistrés. Aucun compte n'a été effacé.`);
    await sequelize.close();
    return;
  }

  // ── Métiers ──────────────────────────────────────────────────────────────
  const metiers = await Metier.bulkCreate([
    { nom: 'Tailleur', description: 'Confection de vêtements et costumes sur mesure', actif: true },
    { nom: 'Menuisier', description: 'Fabrication et création de meubles en bois sur mesure (Menuiserie)', actif: true },
    { nom: 'Coiffeur', description: 'Coiffure traditionnelle, tresses et soins capillaires (Coiffure)', actif: true },
    { nom: 'Cordonnier', description: 'Réparation et fabrication artisanale de chaussures et maroquinerie (Cordonnerie)', actif: true },
    { nom: 'Couturière', description: 'Confection de tenues féminines et robes de cérémonie', actif: true },
    { nom: 'Brodeur', description: 'Broderie traditionnelle et moderne sur tissus', actif: true },
    { nom: 'Styliste', description: 'Création de collections mode contemporaine', actif: true },
  ]);
  console.log(`${metiers.length} métiers créés.`);

  // ── Admin ─────────────────────────────────────────────────────────────────
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
  console.log('Admin créé.');

  // ── Artisans (8) ──────────────────────────────────────────────────────────
  const artisanData = [
    { nom: 'Diallo', prenom: 'Mamadou', tel: '0701000001', email: 'mamadou@artisan.sn', metier: 'Tailleur', atelier: 'Atelier Diallo Couture', loc: 'Dakar, Plateau', note: 4.8, avis: 34, desc: 'Tailleur spécialisé dans les costumes trois pièces et les boubous cérémoniaux depuis 15 ans.', exp: 15, sub: 'actif' },
    { nom: 'Koné', prenom: 'Aïssatou', tel: '0701000002', email: 'aissatou@artisan.sn', metier: 'Couturière', atelier: 'Maison Koné Élégance', loc: 'Abidjan, Cocody', note: 4.9, avis: 52, desc: 'Créatrice de robes de mariée et tenues de cérémonie en bazin riche et dentelle.', exp: 12, sub: 'actif' },
    { nom: 'Diagne', prenom: 'Babacar', tel: '0701000003', email: 'babacar@artisan.sn', metier: 'Menuisier', atelier: 'Atelier Bois & Design Dakar', loc: 'Dakar, Ouakam', note: 4.8, avis: 29, desc: 'Menuisier ébéniste spécialisé dans le mobilier sur mesure en bois noble teck, iroko et kébène.', exp: 16, sub: 'actif' },
    { nom: 'Cissé', prenom: 'Aminata', tel: '0701000004', email: 'aminata@artisan.sn', metier: 'Coiffeur', atelier: 'Salon Coiffure & Tresses Prestige', loc: 'Dakar, Almadies', note: 4.9, avis: 48, desc: 'Spécialiste tresses africaines (Fulani braids, locs), coiffure mariée et perruques sur mesure.', exp: 10, sub: 'actif' },
    { nom: 'Fall', prenom: 'Modou', tel: '0701000005', email: 'modou@artisan.sn', metier: 'Cordonnier', atelier: 'Cordonnerie Fall Cuir & Chaussures', loc: 'Dakar, Médina', note: 4.7, avis: 31, desc: 'Maître cordonnier maroquinier, fabrication artisanale de chaussures en cuir et babouches.', exp: 22, sub: 'actif' },
    { nom: 'Traoré', prenom: 'Ibrahim', tel: '0701000006', email: 'ibrahim@artisan.sn', metier: 'Brodeur', atelier: 'Broderie Traoré & Fils', loc: 'Bamako, Hippodrome', note: 4.6, avis: 28, desc: 'Brodeur traditionnel malinké, spécialiste de la broderie dorée sur grand boubou.', exp: 20, sub: 'actif' },
    { nom: 'Sow', prenom: 'Fatou', tel: '0701000007', email: 'fatou@artisan.sn', metier: 'Styliste', atelier: 'Studio Sow Moderne', loc: 'Dakar, Mermoz', note: 4.7, avis: 41, desc: 'Styliste fusion afro-contemporaine, créations portées lors de la FIMA.', exp: 8, sub: 'actif' },
    { nom: 'Barry', prenom: 'Mariama', tel: '0701000008', email: 'mariama@artisan.sn', metier: 'Couturière', atelier: 'Atelier Barry Guinée', loc: 'Conakry, Kaloum', note: 4.4, avis: 15, desc: 'Spécialiste des tenues de fêtes guinéennes et pagnes imprimés.', exp: 7, sub: 'actif' },
  ];

  const artisanUsers: User[] = [];
  const artisanProfiles: Artisan[] = [];

  for (let i = 0; i < artisanData.length; i++) {
    const d = artisanData[i];
    const u = await User.create({
      nom: d.nom,
      prenom: d.prenom,
      telephone: d.tel,
      email: d.email,
      password: hash('Artisan@2026'),
      role: 'artisan',
      statut: 'actif',
      photoUrl: PHOTOS_ARTISAN[i],
    });
    const photosAtelier = JSON.stringify([PHOTOS_ATELIER[i % PHOTOS_ATELIER.length], PHOTOS_ATELIER[(i + 1) % PHOTOS_ATELIER.length], PHOTOS_ATELIER[(i + 2) % PHOTOS_ATELIER.length]]);
    const a = await Artisan.create({
      userId: u.id,
      métier: d.metier,
      atelier: d.atelier,
      description: d.desc,
      experience: d.exp,
      noteMoyenne: d.note,
      nombreAvis: d.avis,
      statutValidation: 'valide',
      localisation: d.loc,
      zone: d.loc.split(',')[0],
      horaires: 'Lun-Sam 08h-18h',
      photosAtelier,
      statutAbonnement: d.sub as 'actif' | 'inactif',
      dateFinAbonnement: d.sub === 'actif' ? new Date('2027-01-01') : null,
    });
    artisanUsers.push(u);
    artisanProfiles.push(a);
  }
  console.log(`${artisanUsers.length} artisans créés.`);

  // ── Clients (10) ──────────────────────────────────────────────────────────
  const clientData = [
    { nom: 'Dramé', prenom: 'Abdou', tel: '774979236', email: 'abdou@client.sn', loc: 'Dakar', pass: 'Iniesta99' },
    { nom: 'Touré', prenom: 'Aminata', tel: '0702000001', email: 'aminata@client.sn', loc: 'Dakar' },
    { nom: 'Bah', prenom: 'Kadiatou', tel: '0702000002', email: 'kadiatou@client.sn', loc: 'Abidjan' },
    { nom: 'Sy', prenom: 'Modibo', tel: '0702000003', email: 'modibo@client.sn', loc: 'Bamako' },
    { nom: 'Cissé', prenom: 'Rokia', tel: '0702000004', email: 'rokia@client.sn', loc: 'Dakar' },
    { nom: 'Keita', prenom: 'Lamine', tel: '0702000005', email: 'lamine@client.sn', loc: 'Conakry' },
    { nom: 'Doumbia', prenom: 'Oumou', tel: '0702000006', email: 'oumou@client.sn', loc: 'Dakar' },
    { nom: 'Sanogo', prenom: 'Cheick', tel: '0702000007', email: 'cheick@client.sn', loc: 'Abidjan' },
    { nom: 'Diop', prenom: 'Ndéye', tel: '0702000008', email: 'ndeye@client.sn', loc: 'Saint-Louis' },
    { nom: 'Fofana', prenom: 'Moussa', tel: '0702000009', email: 'moussa@client.sn', loc: 'Dakar' },
    { nom: 'Kouyaté', prenom: 'Hawa', tel: '0702000010', email: 'hawa@client.sn', loc: 'Conakry' },
  ];

  const clientUsers: User[] = [];
  for (let i = 0; i < clientData.length; i++) {
    const d = clientData[i];
    const u = await User.create({
      nom: d.nom,
      prenom: d.prenom,
      telephone: d.tel,
      email: d.email,
      password: hash(d.pass || 'Client@2026'),
      role: 'client',
      statut: 'actif',
      photoUrl: PHOTOS_CLIENT[i % PHOTOS_CLIENT.length],
    });
    await Client.create({ userId: u.id, localisation: d.loc });
    clientUsers.push(u);
  }
  console.log(`${clientUsers.length} clients créés.`);

  // ── Créations / Catalogue (16) ────────────────────────────────────────────
  const creationDefs = [
    // artisan 0 — Diallo Tailleur
    {
      aIdx: 0,
      titre: 'Grand Boubou Brodé Or',
      desc: 'Boubou en bazin blanc avec broderie dorée sur col et poignets. Livré avec pantalon assorti.',
      prix: 85000,
      delai: '10-14 jours',
      cat: 'Boubou',
      mainPhoto: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&q=80', 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80']
    },
    {
      aIdx: 0,
      titre: 'Costume Trois Pièces Africain',
      desc: 'Veste, gilet et pantalon en kente tissé main. Idéal pour cérémonies et mariages.',
      prix: 120000,
      delai: '14-21 jours',
      cat: 'Costume',
      mainPhoto: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80', 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800&q=80']
    },

    // artisan 1 — Koné Couturière
    {
      aIdx: 1,
      titre: 'Robe de Mariée Bazin',
      desc: 'Robe longue en bazin riche blanc cassé avec broderie florale argentée. Sur mesure exclusivement.',
      prix: 250000,
      delai: '21-30 jours',
      cat: 'Mariage',
      mainPhoto: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=800&q=80', 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&q=80']
    },
    {
      aIdx: 1,
      titre: 'Tenue de Cérémonie Wax',
      desc: 'Robe bustier et veste longue assortie en wax Vlisco premium. Coloris au choix.',
      prix: 75000,
      delai: '10-14 jours',
      cat: 'Cérémonie',
      mainPhoto: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=800&q=80']
    },

    // artisan 2 — Diagne Menuisier (Menuiserie)
    {
      aIdx: 2,
      titre: 'Table à Manger Bois Massif & Résine',
      desc: 'Table à manger 8 personnes en teck massif sculpté à la main, finitions vernis mat.',
      prix: 185000,
      delai: '14-21 jours',
      cat: 'Mobilier',
      mainPhoto: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80']
    },
    {
      aIdx: 2,
      titre: 'Meuble TV Rangement Ébène & Laiton',
      desc: 'Buffet bas pour salon en bois rouge d\'Afrique avec inserts laiton doré.',
      prix: 220000,
      delai: '15-20 jours',
      cat: 'Mobilier',
      mainPhoto: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1538688525198-9b88f6f53126?w=800&q=80', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&q=80']
    },

    // artisan 3 — Cissé Coiffeuse (Coiffure)
    {
      aIdx: 3,
      titre: 'Tresses Fulani Braids Tendance',
      desc: 'Coiffure tresses africaines Fulani avec perles et bijoux de cheveux sur mesure.',
      prix: 25000,
      delai: '2-3 heures',
      cat: 'Coiffure',
      mainPhoto: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&q=80', 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80']
    },
    {
      aIdx: 3,
      titre: 'Coiffure Mariée & Chignon Royal',
      desc: 'Coiffure d\'apparat pour mariage avec fixation voile et ornements dorés.',
      prix: 45000,
      delai: '3-4 heures',
      cat: 'Coiffure',
      mainPhoto: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800&q=80', 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=800&q=80']
    },

    // artisan 4 — Fall Cordonnier (Cordonnerie)
    {
      aIdx: 4,
      titre: 'Chaussures Richelieu Cuir Fait Main',
      desc: 'Chaussures de ville homme cousu Goodyear en cuir tanné végétal sur mesure.',
      prix: 55000,
      delai: '7-10 jours',
      cat: 'Maroquinerie',
      mainPhoto: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80', 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80']
    },
    {
      aIdx: 4,
      titre: 'Sac & Maroquinerie Cuir Artisanal',
      desc: 'Sac de voyage haut de gamme en cuir véritable tannage traditionnel.',
      prix: 65000,
      delai: '5-7 jours',
      cat: 'Maroquinerie',
      mainPhoto: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&q=80', 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&q=80']
    },

    // artisan 5 — Traoré Brodeur
    {
      aIdx: 5,
      titre: 'Broderie Grand Boubou Malinké',
      desc: 'Broderie traditionnelle sur boubou existant ou tissu fourni. Motifs géométriques dorés.',
      prix: 35000,
      delai: '5-7 jours',
      cat: 'Broderie',
      mainPhoto: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80']
    },
    {
      aIdx: 5,
      titre: 'Nappe Brodée Cérémonie',
      desc: 'Nappe de table 3m x 1.5m avec broderie florale blanche sur fond ivoire.',
      prix: 60000,
      delai: '10-14 jours',
      cat: 'Décoration',
      mainPhoto: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&q=80', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80']
    },

    // artisan 6 — Sow Styliste
    {
      aIdx: 6,
      titre: 'Collection Sahel — Robe Moderne',
      desc: 'Robe asymétrique inspirée des dunes du Sahel. Tissu organza avec sous-robe pagne.',
      prix: 95000,
      delai: '14-21 jours',
      cat: 'Prêt-à-porter',
      mainPhoto: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=800&q=80']
    },
    {
      aIdx: 6,
      titre: 'Kimono Wax Contemporain',
      desc: 'Kimono longue traîne en wax imprimé, doublure soie. Pièce unique numérotée.',
      prix: 130000,
      delai: '14-21 jours',
      cat: 'Prêt-à-porter',
      mainPhoto: 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&q=80', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80']
    },

    // artisan 7 — Barry Couturière
    {
      aIdx: 7,
      titre: 'Tenue de Fête Guinéenne',
      desc: 'Ensemble complet (robe + foulard + ceinture) en bazin teint main aux couleurs vives.',
      prix: 65000,
      delai: '10-14 jours',
      cat: 'Cérémonie',
      mainPhoto: 'https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80', 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=800&q=80']
    },
    {
      aIdx: 7,
      titre: 'Robe Pagne Courte',
      desc: 'Robe droite mi-cuisses en pagne imprimé africain. Disponible en plusieurs coloris.',
      prix: 28000,
      delai: '5-7 jours',
      cat: 'Prêt-à-porter',
      mainPhoto: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
      extras: ['https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=800&q=80', 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?w=800&q=80']
    },
  ];

  const creations: Creation[] = [];
  for (const c of creationDefs) {
    const cr = await Creation.create({
      artisanId: artisanProfiles[c.aIdx].id,
      titre: c.titre,
      description: c.desc,
      photoUrl: c.mainPhoto,
      prixEstimatif: c.prix,
      delaiEstime: c.delai,
      categorie: c.cat,
      photos: JSON.stringify(c.extras),
      nombreCommandes: Math.floor(Math.random() * 15),
    });
    creations.push(cr);
  }
  console.log(`${creations.length} créations ajoutées.`);

  // ── Commandes (20) ────────────────────────────────────────────────────────
  const orderDefs: Array<{
    aIdx: number; cIdx: number; crIdx: number;
    prix: number; statut: string; couleur: string; taille: string;
    payStatus: string; deposit: number | null;
  }> = [
    { aIdx: 0, cIdx: 0, crIdx: 0, prix: 85000, statut: 'livree',     couleur: 'Blanc',    taille: 'XL',  payStatus: 'fully_paid',   deposit: null },
    { aIdx: 0, cIdx: 1, crIdx: 1, prix: 120000, statut: 'en_cours',   couleur: 'Multicolore', taille: 'L', payStatus: 'deposit_paid', deposit: 60000 },
    { aIdx: 1, cIdx: 2, crIdx: 3, prix: 250000, statut: 'en_finition',couleur: 'Blanc cassé', taille: 'S', payStatus: 'deposit_paid', deposit: 125000 },
    { aIdx: 1, cIdx: 3, crIdx: 4, prix: 75000,  statut: 'prete',      couleur: 'Jaune/Rouge', taille: 'M', payStatus: 'deposit_paid', deposit: 37500 },
    { aIdx: 2, cIdx: 4, crIdx: 6, prix: 35000,  statut: 'livree',     couleur: 'Or',       taille: 'Unique', payStatus: 'fully_paid', deposit: null },
    { aIdx: 2, cIdx: 5, crIdx: 7, prix: 60000,  statut: 'acceptee',   couleur: 'Ivoire',   taille: '3m',  payStatus: 'deposit_paid', deposit: 30000 },
    { aIdx: 3, cIdx: 6, crIdx: 8, prix: 95000,  statut: 'en_cours',   couleur: 'Terracotta', taille: 'M', payStatus: 'deposit_paid', deposit: 47500 },
    { aIdx: 3, cIdx: 7, crIdx: 9, prix: 130000, statut: 'en_attente', couleur: 'Indigo',   taille: 'XS',  payStatus: 'unpaid',       deposit: null },
    { aIdx: 4, cIdx: 8, crIdx: 11, prix: 45000, statut: 'livree',     couleur: 'Rouge/Or', taille: 'Unique', payStatus: 'fully_paid', deposit: null },
    { aIdx: 4, cIdx: 9, crIdx: 12, prix: 56000, statut: 'acceptee',   couleur: 'Multicolore', taille: '4m', payStatus: 'deposit_paid', deposit: 28000 },
    { aIdx: 5, cIdx: 0, crIdx: 13, prix: 65000, statut: 'en_cours',   couleur: 'Vert/Jaune', taille: 'L', payStatus: 'deposit_paid', deposit: 32500 },
    { aIdx: 5, cIdx: 1, crIdx: 14, prix: 28000, statut: 'livree',     couleur: 'Rouge',    taille: 'M',   payStatus: 'fully_paid',   deposit: null },
    { aIdx: 6, cIdx: 2, crIdx: 15, prix: 72000, statut: 'prete',      couleur: 'Bleu roi', taille: 'XXL', payStatus: 'deposit_paid', deposit: 36000 },
    { aIdx: 6, cIdx: 3, crIdx: 16, prix: 115000, statut: 'en_cours',  couleur: 'Blanc/Or', taille: 'L',  payStatus: 'deposit_paid', deposit: 57500 },
    { aIdx: 7, cIdx: 4, crIdx: 17, prix: 25000, statut: 'livree',     couleur: 'Varié',    taille: 'Unique', payStatus: 'fully_paid', deposit: null },
    { aIdx: 7, cIdx: 5, crIdx: 18, prix: 140000, statut: 'acceptee',  couleur: 'Noir/Or',  taille: 'S',  payStatus: 'deposit_paid', deposit: 70000 },
    { aIdx: 0, cIdx: 6, crIdx: 2, prix: 45000,  statut: 'annulee',   couleur: 'Gris',      taille: 'M',  payStatus: 'unpaid',       deposit: null },
    { aIdx: 1, cIdx: 7, crIdx: 5, prix: 55000,  statut: 'livree',    couleur: 'Orange',    taille: 'L',  payStatus: 'fully_paid',   deposit: null },
    { aIdx: 3, cIdx: 8, crIdx: 10, prix: 68000, statut: 'en_attente', couleur: 'Kaki/Rouge', taille: 'S', payStatus: 'unpaid',      deposit: null },
    { aIdx: 6, cIdx: 9, crIdx: 15, prix: 72000, statut: 'acceptee',  couleur: 'Marron',    taille: 'XL', payStatus: 'deposit_paid', deposit: 36000 },
  ];

  const orders: Order[] = [];
  const baseDate = new Date('2026-01-15');
  for (let i = 0; i < orderDefs.length; i++) {
    const d = orderDefs[i];
    const createdAt = new Date(baseDate.getTime() + i * 4 * 24 * 3600 * 1000);
    const o = await Order.create({
      artisanId: artisanProfiles[d.aIdx].id,
      clientId: clientUsers[d.cIdx].id,
      modeleId: creations[d.crIdx % creations.length].id,
      mesures: 'Tour de poitrine: 92cm, Tour de taille: 72cm, Tour de hanches: 98cm, Longueur dos: 42cm',
      consignes: 'Finitions main soignées, éviter les dorures trop proéminentes',
      prix: d.prix,
      totalPrice: d.prix,
      depositAmount: d.deposit,
      statut: d.statut as any,
      couleur: d.couleur,
      taille: d.taille,
      matiere: 'Bazin riche',
      paymentStatus: d.payStatus as any,
      deliveryDate: d.statut === 'livree' ? new Date(createdAt.getTime() + 20 * 24 * 3600 * 1000) : null,
      motifAnnulation: d.statut === 'annulee' ? 'Client a changé d\'avis' : null,
      createdAt,
      updatedAt: createdAt,
    });
    orders.push(o);
  }
  console.log(`${orders.length} commandes créées.`);

  // ── Messages (30) ─────────────────────────────────────────────────────────
  const msgPairs: Array<{ oIdx: number; texts: Array<{ fromArtisan: boolean; texte: string }> }> = [
    { oIdx: 0, texts: [
      { fromArtisan: false, texte: 'Bonjour, j\'ai bien reçu ma commande. Merci beaucoup !' },
      { fromArtisan: true,  texte: 'Avec plaisir ! Votre satisfaction est notre priorité. N\'hésitez pas à nous contacter.' },
    ]},
    { oIdx: 1, texts: [
      { fromArtisan: false, texte: 'Bonjour, où en êtes-vous avec mon costume ?' },
      { fromArtisan: true,  texte: 'Bonjour ! Le tissage est terminé. Nous en sommes à la coupe. Livraison prévue dans 5 jours.' },
      { fromArtisan: false, texte: 'Parfait, merci pour la mise à jour !' },
    ]},
    { oIdx: 2, texts: [
      { fromArtisan: false, texte: 'Pouvez-vous changer la coupe en A-line au lieu de droite ?' },
      { fromArtisan: true,  texte: 'Bien sûr, c\'est noté. Cela correspond mieux à votre morphologie effectivement.' },
      { fromArtisan: false, texte: 'Merci beaucoup ! Vous avez une photo d\'avancement ?' },
      { fromArtisan: true,  texte: 'Je vous envoie ça demain matin.' },
    ]},
    { oIdx: 3, texts: [
      { fromArtisan: false, texte: 'Bonjour, ma tenue est prête apparemment — quand puis-je venir la récupérer ?' },
      { fromArtisan: true,  texte: 'Bonjour ! Vous pouvez passer dès demain entre 9h et 17h.' },
    ]},
    { oIdx: 6, texts: [
      { fromArtisan: false, texte: 'Bonjour, j\'ai vu que vous travaillez sur ma robe. Avez-vous besoin d\'autres informations ?' },
      { fromArtisan: true,  texte: 'Bonjour ! Pourriez-vous me préciser si vous souhaitez une fente sur le côté ou dans le dos ?' },
      { fromArtisan: false, texte: 'Sur le côté gauche, de préférence.' },
    ]},
    { oIdx: 10, texts: [
      { fromArtisan: true,  texte: 'Bonjour, votre tissu bazin est arrivé. Couleur magnifique !' },
      { fromArtisan: false, texte: 'Super ! Je suis contente. Est-ce que vous avez commencé la coupe ?' },
      { fromArtisan: true,  texte: 'Oui, la coupe est faite. Nous commençons l\'assemblage demain.' },
    ]},
  ];

  for (const pair of msgPairs) {
    const o = orders[pair.oIdx];
    for (const m of pair.texts) {
      const sender = m.fromArtisan ? artisanUsers[orderDefs[pair.oIdx].aIdx] : clientUsers[orderDefs[pair.oIdx].cIdx];
      await Message.create({
        orderId: o.id,
        senderId: sender.id,
        texte: m.texte,
        lu: true,
      });
    }
  }
  console.log('Messages créés.');

  // ── Rendez-vous (15) ──────────────────────────────────────────────────────
  const apptDefs = [
    { aIdx: 0, cIdx: 0, type: 'prise_mesures', statut: 'accepte', date: '2026-08-10T10:00:00' },
    { aIdx: 0, cIdx: 1, type: 'essayage',      statut: 'confirme', date: '2026-08-15T14:00:00' },
    { aIdx: 1, cIdx: 2, type: 'consultation',  statut: 'termine', date: '2026-07-01T09:00:00' },
    { aIdx: 1, cIdx: 3, type: 'prise_mesures', statut: 'accepte', date: '2026-08-20T11:00:00' },
    { aIdx: 2, cIdx: 4, type: 'depot_article', statut: 'termine', date: '2026-06-15T16:00:00' },
    { aIdx: 2, cIdx: 5, type: 'retrait',       statut: 'confirme', date: '2026-08-12T10:00:00' },
    { aIdx: 3, cIdx: 6, type: 'consultation',  statut: 'demande', date: '2026-09-01T15:00:00' },
    { aIdx: 3, cIdx: 7, type: 'prise_mesures', statut: 'pending', date: '2026-09-05T10:00:00' },
    { aIdx: 4, cIdx: 8, type: 'retrait',       statut: 'termine', date: '2026-05-20T11:00:00' },
    { aIdx: 5, cIdx: 9, type: 'essayage',      statut: 'accepte', date: '2026-08-25T14:00:00' },
    { aIdx: 6, cIdx: 0, type: 'prise_mesures', statut: 'termine', date: '2026-06-01T09:00:00' },
    { aIdx: 6, cIdx: 1, type: 'retrait',       statut: 'confirme', date: '2026-08-18T16:00:00' },
    { aIdx: 7, cIdx: 2, type: 'depot_article', statut: 'termine', date: '2026-07-10T10:00:00' },
    { aIdx: 7, cIdx: 3, type: 'consultation',  statut: 'refuse', date: '2026-08-30T11:00:00' },
    { aIdx: 0, cIdx: 4, type: 'domicile',      statut: 'demande', date: '2026-09-10T09:00:00' },
  ];

  for (const d of apptDefs) {
    await Appointment.create({
      artisanId: artisanProfiles[d.aIdx].id,
      clientId: clientUsers[d.cIdx].id,
      type: d.type as any,
      statut: d.statut as any,
      date: new Date(d.date),
      notes: 'Prévoir 30 minutes. Apporter les tissus si disponibles.',
    });
  }
  console.log(`${apptDefs.length} rendez-vous créés.`);

  // ── Avis (12) ─────────────────────────────────────────────────────────────
  const reviewDefs = [
    { aIdx: 0, cIdx: 0, note: 5, q: 5, d: 5, com: 4, p: 5, pro: 5, commentaire: 'Travail exceptionnel, boubou magnifique. Mamadou est un vrai artiste !' },
    { aIdx: 0, cIdx: 1, note: 5, q: 5, d: 4, com: 5, p: 5, pro: 5, commentaire: 'Très satisfait du costume. Coupe parfaite et dans les délais.' },
    { aIdx: 1, cIdx: 2, note: 5, q: 5, d: 5, com: 5, p: 4, pro: 5, commentaire: 'Robe de mariée de rêve ! Aïssatou a su exactement ce que je voulais.' },
    { aIdx: 1, cIdx: 3, note: 4, q: 4, d: 4, com: 4, p: 4, pro: 5, commentaire: 'Belle tenue, très bonne qualité. Un tout petit retard mais le résultat vaut l\'attente.' },
    { aIdx: 2, cIdx: 4, note: 5, q: 5, d: 5, com: 5, p: 5, pro: 5, commentaire: 'Broderie sublime, digne des grands maîtres malinké.' },
    { aIdx: 3, cIdx: 6, note: 5, q: 5, d: 4, com: 5, p: 4, pro: 5, commentaire: 'Style unique, Fatou est une vraie créatrice. La robe a fait sensation !' },
    { aIdx: 4, cIdx: 8, note: 4, q: 5, d: 4, com: 4, p: 5, pro: 4, commentaire: 'Magnifique écharpe kente. Authentique et très bien tissée.' },
    { aIdx: 5, cIdx: 1, note: 4, q: 4, d: 5, com: 4, p: 5, pro: 4, commentaire: 'Jolie robe, couleurs vives et fidèles. Livraison rapide.' },
    { aIdx: 6, cIdx: 0, note: 4, q: 4, d: 4, com: 4, p: 4, pro: 5, commentaire: 'Boubou de qualité, coupe traditionnelle comme je l\'aime.' },
    { aIdx: 7, cIdx: 4, note: 5, q: 5, d: 5, com: 5, p: 5, pro: 5, commentaire: 'Broderie impeccable, service rapide et professionnel.' },
    { aIdx: 0, cIdx: 5, note: 4, q: 4, d: 5, com: 5, p: 4, pro: 4, commentaire: 'Très bon artisan, je recommande vivement.' },
    { aIdx: 3, cIdx: 7, note: 5, q: 5, d: 5, com: 5, p: 4, pro: 5, commentaire: 'Talent et créativité au rendez-vous. Pièce unique magnifique.' },
  ];

  for (const d of reviewDefs) {
    await Review.create({
      artisanId: artisanProfiles[d.aIdx].id,
      clientId: clientUsers[d.cIdx].id,
      note: d.note,
      noteQualite: d.q,
      noteDelai: d.d,
      noteCommunication: d.com,
      notePrix: d.p,
      noteProfessionnalisme: d.pro,
      commentaire: d.commentaire,
    });
  }
  console.log(`${reviewDefs.length} avis créés.`);

  // ── Paiements (15) ────────────────────────────────────────────────────────
  const paymentDefs = [
    { oIdx: 0, aIdx: 0, montant: 85000, type: 'integral',      moyen: 'wave',          statut: 'confirme' },
    { oIdx: 1, aIdx: 0, montant: 60000, type: 'acompte',       moyen: 'orange_money',  statut: 'confirme' },
    { oIdx: 2, aIdx: 1, montant: 125000, type: 'acompte',      moyen: 'wave',          statut: 'confirme' },
    { oIdx: 3, aIdx: 1, montant: 37500, type: 'acompte',       moyen: 'free_money',    statut: 'confirme' },
    { oIdx: 4, aIdx: 2, montant: 35000, type: 'integral',      moyen: 'especes',       statut: 'confirme' },
    { oIdx: 5, aIdx: 2, montant: 30000, type: 'acompte',       moyen: 'wave',          statut: 'confirme' },
    { oIdx: 6, aIdx: 3, montant: 47500, type: 'acompte',       moyen: 'orange_money',  statut: 'confirme' },
    { oIdx: 8, aIdx: 4, montant: 45000, type: 'integral',      moyen: 'especes',       statut: 'confirme' },
    { oIdx: 9, aIdx: 4, montant: 28000, type: 'acompte',       moyen: 'wave',          statut: 'confirme' },
    { oIdx: 10, aIdx: 5, montant: 32500, type: 'acompte',      moyen: 'free_money',    statut: 'confirme' },
    { oIdx: 11, aIdx: 5, montant: 28000, type: 'integral',     moyen: 'especes',       statut: 'confirme' },
    { oIdx: 12, aIdx: 6, montant: 36000, type: 'acompte',      moyen: 'wave',          statut: 'confirme' },
    { oIdx: 13, aIdx: 6, montant: 57500, type: 'acompte',      moyen: 'orange_money',  statut: 'confirme' },
    { oIdx: 14, aIdx: 7, montant: 25000, type: 'integral',     moyen: 'especes',       statut: 'confirme' },
    { oIdx: 15, aIdx: 7, montant: 70000, type: 'acompte',      moyen: 'wave',          statut: 'confirme' },
  ];

  for (const d of paymentDefs) {
    await Payment.create({
      orderId: orders[d.oIdx].id,
      artisanId: artisanProfiles[d.aIdx].id,
      montant: d.montant,
      type: d.type as any,
      moyen: d.moyen as any,
      statut: d.statut as any,
      referenceTransaction: `TXN-${Date.now()}-${d.oIdx}`,
    });
  }
  console.log(`${paymentDefs.length} paiements créés.`);

  // ── Abonnements artisans (paiements de type abonnement) ───────────────────
  for (let i = 0; i < 5; i++) {
    await Payment.create({
      orderId: null,
      artisanId: artisanProfiles[i].id,
      montant: 15000,
      type: 'abonnement',
      moyen: i % 2 === 0 ? 'wave' : 'orange_money',
      statut: 'confirme',
      referenceTransaction: `SUB-${Date.now()}-${i}`,
    });
  }

  // ── Notifications (20) ────────────────────────────────────────────────────
  const notifDefs = [
    { uIdx: 0, uidx_is_client: true,  type: 'commande_statut', titre: 'Commande acceptée',        desc: 'Mamadou Diallo a accepté votre commande de Grand Boubou Brodé.' },
    { uIdx: 0, uidx_is_client: true,  type: 'commande_statut', titre: 'Commande livrée',           desc: 'Votre commande de Grand Boubou Brodé Or est prête à être récupérée.' },
    { uIdx: 1, uidx_is_client: true,  type: 'commande_statut', titre: 'Avancement commande',       desc: 'Votre costume est en cours de fabrication. Livraison estimée dans 5 jours.' },
    { uIdx: 2, uidx_is_client: true,  type: 'commande_statut', titre: 'Commande en finition',      desc: 'Votre robe de mariée est en phase de finition. Encore quelques jours !' },
    { uIdx: 3, uidx_is_client: true,  type: 'commande_statut', titre: 'Tenue prête',               desc: 'Votre tenue cérémonie est prête. Vous pouvez venir la récupérer.' },
    { uIdx: 0, uidx_is_client: true,  type: 'nouveau_message', titre: 'Nouveau message',           desc: 'Mamadou Diallo vous a envoyé un message concernant votre commande.' },
    { uIdx: 2, uidx_is_client: true,  type: 'nouveau_message', titre: 'Message de votre artisan',  desc: 'Aïssatou Koné a une question sur votre robe de mariée.' },
    { uIdx: 1, uidx_is_client: true,  type: 'rdv_statut',      titre: 'RDV confirmé',              desc: 'Votre rendez-vous d\'essayage le 15 août à 14h a été confirmé.' },
    { uIdx: 3, uidx_is_client: true,  type: 'demande_rdv',     titre: 'Rappel RDV demain',         desc: 'Rappel : prise de mesures chez Aïssatou Koné demain à 11h.' },
    { uIdx: 4, uidx_is_client: true,  type: 'notation',        titre: 'Laissez un avis',           desc: 'Votre commande est livrée. Notez Ibrahim Traoré pour l\'aider à progresser.' },
    { uIdx: 0, uidx_is_client: true,  type: 'paiement',        titre: 'Paiement confirmé',         desc: 'Votre paiement de 85 000 FCFA a bien été enregistré.' },
    { uIdx: 5, uidx_is_client: true,  type: 'paiement',        titre: 'Paiement reçu',             desc: 'Votre acompte de 32 500 FCFA a été confirmé pour la commande #11.' },
    // Notifications artisans
    { uIdx: 0, uidx_is_client: false, type: 'commande_statut', titre: 'Nouvelle commande',         desc: 'Aminata Touré a passé une commande de Grand Boubou Brodé Or.' },
    { uIdx: 0, uidx_is_client: false, type: 'paiement',        titre: 'Acompte reçu',              desc: 'Vous avez reçu un acompte de 60 000 FCFA pour le Costume Trois Pièces.' },
    { uIdx: 1, uidx_is_client: false, type: 'demande_rdv',     titre: 'Nouvelle demande RDV',      desc: 'Rokia Cissé demande un rendez-vous de prise de mesures le 20 août.' },
    { uIdx: 1, uidx_is_client: false, type: 'notation',        titre: 'Nouvel avis reçu',          desc: 'Modibo Sy vous a laissé un avis 5 étoiles. Bravo !' },
    { uIdx: 2, uidx_is_client: false, type: 'commande_statut', titre: 'Nouvelle commande reçue',   desc: 'Une commande de broderie sur nappe vient d\'être passée par Oumou Doumbia.' },
    { uIdx: 3, uidx_is_client: false, type: 'paiement',        titre: 'Abonnement actif',          desc: 'Votre abonnement ModèlePro est actif jusqu\'au 1er janvier 2027.' },
    { uIdx: 4, uidx_is_client: false, type: 'rappel',          titre: 'Abonnement expiré',         desc: 'Votre abonnement est expiré. Renouvelez pour maintenir votre visibilité.' },
    { uIdx: 5, uidx_is_client: false, type: 'rdv_statut',      titre: 'RDV annulé',                desc: 'Le rendez-vous du 30 août avec Rokia Cissé a été annulé par le client.' },
  ];

  for (const d of notifDefs) {
    const user = d.uidx_is_client ? clientUsers[d.uIdx] : artisanUsers[d.uIdx];
    await Notification.create({
      userId: user.id,
      type: d.type as any,
      titre: d.titre,
      description: d.desc,
      lu: false,
      referenceId: null,
    });
  }
  console.log(`${notifDefs.length} notifications créées.`);

  // ── Réclamations (3) ──────────────────────────────────────────────────────
  await Claim.create({ orderId: orders[16].id, clientId: clientUsers[6].id, sujet: 'Commande annulée sans raison valable', description: 'Ma commande a été annulée sans explication satisfaisante. Je demande un remboursement ou une reprise de commande.', statut: 'en_cours' });
  await Claim.create({ orderId: orders[4].id,  clientId: clientUsers[4].id, sujet: 'Qualité insatisfaisante', description: 'La broderie reçue ne correspond pas aux photos du catalogue. Les fils dorés s\'effilochent déjà.', statut: 'resolu' });
  await Claim.create({ orderId: orders[11].id, clientId: clientUsers[1].id, sujet: 'Délai non respecté', description: 'La robe devait être livrée il y a 3 jours. Je n\'ai toujours pas de nouvelles malgré mes messages.', statut: 'en_attente' });
  console.log('3 réclamations créées.');

  console.log('\n✅ Seed terminé avec succès !');
  console.log('──────────────────────────────────');
  console.log('Comptes de connexion :');
  console.log('  Admin    : 0600000000 / Admin@2026');
  console.log('  Artisans : 0701000001 à 0701000008 / Artisan@2026');
  console.log('  Clients  : 0702000001 à 0702000010 / Client@2026');
  console.log('──────────────────────────────────');

  await sequelize.close();
}

seed().catch((err) => {
  console.error('Erreur seed :', err);
  process.exit(1);
});
