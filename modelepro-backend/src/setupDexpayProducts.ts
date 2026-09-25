import sequelize from './config/database';
import './models/index';
import { SubscriptionPlan } from './models/SubscriptionPlan';
import { createProduct, isDexpayConfigured } from './services/dexpayService';

// Mise en place initiale DexPay (une seule fois, guide fourni par l'utilisateur le 2026-09-25) :
// crée un produit DexPay (type recurring) par formule payante (Essentiel/Pro/Business — Entreprise
// est sur devis, pas de produit fixe) × par cycle (mensuel/annuel), et affiche les variables
// DEXPAY_PRODUCT_<PLAN>_<PERIODE> à coller dans .env. DexPay ne permet pas de relister les
// produits créés par nom après coup, donc CE SCRIPT NE DOIT PAS ÊTRE RELANCÉ une fois les
// produits créés (il en recréerait des doublons) — si un prix change, corriger le produit
// existant depuis le tableau de bord DexPay plutôt que d'en recréer un.
//   npm run dexpay:setup-products
//
// 'XOF' (code ISO 4217) confirmé comme la devise attendue par DexPay pour les francs CFA (vérifié
// par l'utilisateur contre un vrai sandbox DexPay, 2026-09-25).
const CURRENCY = 'XOF';

const run = async () => {
  if (!isDexpayConfigured()) {
    console.error('DEXPAY_BASE_URL, DEXPAY_PUBLIC_KEY et DEXPAY_SECRET_KEY doivent être renseignés dans .env avant de lancer ce script.');
    process.exit(1);
  }

  await sequelize.sync();
  const plans = await SubscriptionPlan.findAll({ where: { code: ['essentiel', 'pro', 'business'] } });
  if (plans.length === 0) {
    console.error('Aucune formule trouvée. Démarrez le serveur au moins une fois (npm run dev) pour que les formules par défaut soient créées, puis relancez ce script.');
    process.exit(1);
  }

  console.log('# Colle ces lignes dans modelepro-backend/.env :\n');
  for (const plan of plans) {
    for (const [periode, billingPeriod, price] of [
      ['MENSUEL', 'monthly', plan.prixMensuel],
      ['ANNUEL', 'yearly', plan.prixAnnuel],
    ] as const) {
      const product = await createProduct({
        name: `Naatalix ${plan.nom} (${periode === 'ANNUEL' ? 'annuel' : 'mensuel'})`,
        billingPeriod,
        price,
        currency: CURRENCY,
      });
      console.log(`DEXPAY_PRODUCT_${plan.code.toUpperCase()}_${periode}=${product.id}`);
    }
  }

  await sequelize.close();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
