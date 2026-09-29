// Moteur de calcul du module Rentabilité (Cahier_des_charges_Module_Naatalix_Rentabilite.docx
// §10-19, §41). Fonctions pures, indépendantes de Sequelize/Express — testées unitairement
// (src/__tests__/profitabilityCalculation.test.ts) et réutilisées par profitabilityController
// pour la simulation de base, les scénarios, l'analyse de sensibilité et les remises.

export interface CostLine {
  montant: number;
  type: 'fixe' | 'variable';
}

export interface SimulationInputs {
  prixEnvisage: number;
  quantitePrevue: number;
  margeCibleType: 'marge' | 'marque';
  margeCiblePct: number;
  margePremiumBonusPct: number;
  investissementInitial?: number | null;
}

export interface SimulationResults {
  coutVariableUnitaire: number;
  chargesFixesTotales: number;
  coutCompletUnitaire: number;
  beneficeUnitaire: number;
  tauxMarge: number;
  tauxMarque: number;
  coutMaximalAcceptable: number;
  prixPlancher: number;
  prixMinimumRecommande: number;
  prixPremium: number;
  seuilRentabiliteCA: number | null;
  seuilRentabiliteVolume: number | null;
  roiPct: number | null;
  statutRentabilite: 'vert' | 'orange' | 'rouge';
}

// Coût variable = saisi PAR UNITÉ (s'additionne directement) ; coût fixe = saisi en TOTAL sur la
// période (réparti ensuite sur quantitePrevue). Convention alignée sur l'exemple chiffré §41.
export const computeResults = (inputs: SimulationInputs, costs: CostLine[]): SimulationResults => {
  const coutVariableUnitaire = costs.filter((c) => c.type === 'variable').reduce((s, c) => s + c.montant, 0);
  const chargesFixesTotales = costs.filter((c) => c.type === 'fixe').reduce((s, c) => s + c.montant, 0);
  const quotePartFixe = inputs.quantitePrevue > 0 ? chargesFixesTotales / inputs.quantitePrevue : 0;
  const coutCompletUnitaire = coutVariableUnitaire + quotePartFixe;
  const beneficeUnitaire = inputs.prixEnvisage - coutCompletUnitaire;

  const tauxMarge = coutCompletUnitaire > 0 ? (beneficeUnitaire / coutCompletUnitaire) * 100 : 0;
  const tauxMarque = inputs.prixEnvisage > 0 ? (beneficeUnitaire / inputs.prixEnvisage) * 100 : 0;

  // §11 : ces deux formules utilisent explicitement le taux "sur CA" (taux de marque), quel que
  // soit margeCibleType choisi par l'utilisateur pour l'affichage du statut — cf. exemple chiffré.
  const coutMaximalAcceptable = inputs.prixEnvisage * (1 - inputs.margeCiblePct / 100);
  const prixMinimumRecommande = inputs.margeCiblePct < 100
    ? coutCompletUnitaire / (1 - inputs.margeCiblePct / 100)
    : 0;
  const prixPlancher = coutCompletUnitaire; // bénéfice nul, prix minimum pour ne pas vendre à perte

  const premiumPct = inputs.margeCiblePct + inputs.margePremiumBonusPct;
  const prixPremium = premiumPct < 100 ? coutCompletUnitaire / (1 - premiumPct / 100) : prixMinimumRecommande;

  // §14 : seuil de rentabilité = charges fixes / taux de marge sur coûts variables (marge de
  // contribution). Non défini si le prix ne couvre même pas le coût variable unitaire.
  const tauxMargeSurCoutsVariables = inputs.prixEnvisage > 0
    ? (inputs.prixEnvisage - coutVariableUnitaire) / inputs.prixEnvisage
    : 0;
  const seuilRentabiliteCA = tauxMargeSurCoutsVariables > 0 ? chargesFixesTotales / tauxMargeSurCoutsVariables : null;
  const seuilRentabiliteVolume = seuilRentabiliteCA !== null && inputs.prixEnvisage > 0
    ? seuilRentabiliteCA / inputs.prixEnvisage
    : null;

  // §29 : ROI = bénéfice généré (sur la période de la simulation) / investissement initial.
  const beneficeTotalPeriode = beneficeUnitaire * inputs.quantitePrevue;
  const roiPct = inputs.investissementInitial && inputs.investissementInitial > 0
    ? (beneficeTotalPeriode / inputs.investissementInitial) * 100
    : null;

  // §19 : VERT si la marge cible est atteinte, ORANGE si bénéficiaire mais sous la cible, ROUGE
  // si perte ou vente à perte.
  const margeAtteinte = inputs.margeCibleType === 'marge' ? tauxMarge : tauxMarque;
  let statutRentabilite: 'vert' | 'orange' | 'rouge';
  if (beneficeUnitaire <= 0) statutRentabilite = 'rouge';
  else if (margeAtteinte >= inputs.margeCiblePct) statutRentabilite = 'vert';
  else statutRentabilite = 'orange';

  return {
    coutVariableUnitaire, chargesFixesTotales, coutCompletUnitaire, beneficeUnitaire,
    tauxMarge, tauxMarque, coutMaximalAcceptable, prixPlancher, prixMinimumRecommande, prixPremium,
    seuilRentabiliteCA, seuilRentabiliteVolume, roiPct, statutRentabilite,
  };
};

// §15 : scénarios prudent/réaliste/optimiste. "Réaliste" = les hypothèses telles que saisies.
export type ScenarioName = 'prudent' | 'realiste' | 'optimiste';

export const applyScenario = (
  inputs: SimulationInputs,
  costs: CostLine[],
  scenario: ScenarioName
): SimulationResults & { quantiteAjustee: number } => {
  let quantiteMultiplier = 1;
  let coutVariableMultiplier = 1;
  if (scenario === 'prudent') { quantiteMultiplier = 0.7; coutVariableMultiplier = 1.1; }
  else if (scenario === 'optimiste') { quantiteMultiplier = 1.3; coutVariableMultiplier = 1; }

  const quantiteAjustee = inputs.quantitePrevue * quantiteMultiplier;
  const adjustedCosts = costs.map((c) => (c.type === 'variable' ? { ...c, montant: c.montant * coutVariableMultiplier } : c));
  const results = computeResults({ ...inputs, quantitePrevue: quantiteAjustee }, adjustedCosts);

  return { ...results, quantiteAjustee };
};

// §16 : analyse de sensibilité — fait varier un paramètre et observe l'impact sur les résultats.
export type SensitivityParameter = 'prix' | 'quantite' | 'coutVariable' | 'chargesFixes';

export const computeSensitivity = (
  inputs: SimulationInputs,
  costs: CostLine[],
  parametre: SensitivityParameter,
  variationsPct: number[]
): Array<SimulationResults & { variationPct: number }> => {
  return variationsPct.map((pct) => {
    let adjInputs = { ...inputs };
    let adjCosts = costs.map((c) => ({ ...c }));

    if (parametre === 'prix') adjInputs.prixEnvisage = inputs.prixEnvisage * (1 + pct / 100);
    else if (parametre === 'quantite') adjInputs.quantitePrevue = inputs.quantitePrevue * (1 + pct / 100);
    else if (parametre === 'coutVariable') adjCosts = adjCosts.map((c) => (c.type === 'variable' ? { ...c, montant: c.montant * (1 + pct / 100) } : c));
    else if (parametre === 'chargesFixes') adjCosts = adjCosts.map((c) => (c.type === 'fixe' ? { ...c, montant: c.montant * (1 + pct / 100) } : c));

    return { variationPct: pct, ...computeResults(adjInputs, adjCosts) };
  });
};

// §17 : simulation de remises — impact sur la marge, signalement si le prix remisé passe sous
// le seuil de rentabilité ou sous la marge minimale définie.
export const computeDiscountSimulation = (
  inputs: SimulationInputs,
  costs: CostLine[],
  tauxRemisePcts: number[]
): Array<SimulationResults & { tauxRemisePct: number; prixApresRemise: number; sousLeSeuilDeRentabilite: boolean; sousLaMargeCible: boolean }> => {
  return tauxRemisePcts.map((pct) => {
    const prixApresRemise = inputs.prixEnvisage * (1 - pct / 100);
    const results = computeResults({ ...inputs, prixEnvisage: prixApresRemise }, costs);
    const margeAtteinte = inputs.margeCibleType === 'marge' ? results.tauxMarge : results.tauxMarque;
    return {
      tauxRemisePct: pct,
      prixApresRemise,
      ...results,
      sousLeSeuilDeRentabilite: results.beneficeUnitaire <= 0,
      sousLaMargeCible: margeAtteinte < inputs.margeCiblePct,
    };
  });
};

// §13 : fonction "Je veux gagner X FCFA" — ventes nécessaires pour atteindre un objectif de
// bénéfice. Retourne null si le bénéfice unitaire actuel est nul ou négatif (aucun volume ne
// permet d'atteindre un objectif positif dans ce cas).
export interface TargetProfitResult {
  ventesNecessaires: number;
  caNecessaire: number;
  ventesParJour: number;
  ventesParSemaine: number;
  ventesParMois: number;
}

const JOURS_PAR_PERIODE: Record<string, number> = { jour: 1, semaine: 7, mois: 30, trimestre: 90, annee: 365 };

export const computeTargetProfit = (
  objectifBenefice: number,
  beneficeUnitaire: number,
  prixEnvisage: number,
  periode: string
): TargetProfitResult | null => {
  if (beneficeUnitaire <= 0) return null;

  const ventesNecessaires = objectifBenefice / beneficeUnitaire;
  const jours = JOURS_PAR_PERIODE[periode] || 30;
  const ventesParJour = ventesNecessaires / jours;

  return {
    ventesNecessaires,
    caNecessaire: ventesNecessaires * prixEnvisage,
    ventesParJour,
    ventesParSemaine: ventesParJour * 7,
    ventesParMois: ventesParJour * 30,
  };
};

// Rentabilité avancée (2026-09-26) : prévisionnel vs réel automatisé — écarts entre ce qui était
// simulé et ce qui s'est réellement passé (ventes réelles du produit lié à la simulation).
// LIMITE ASSUMÉE : le coût variable unitaire et les charges fixes réels ne sont pas mesurés
// automatiquement (pas de comptabilité analytique en temps réel dans Naatalix) — le "bénéfice réel"
// est donc une APPROXIMATION qui réapplique les coûts PRÉVISIONNELS de la simulation au volume
// RÉEL, pas un vrai coût constaté. Toujours renvoyé sous le nom `reelApprox`, jamais présenté comme
// un chiffre exact, pour ne pas induire en erreur.
export interface ActualsInput {
  quantiteReelle: number;
  caReel: number;
}

export interface PrevisionnelVsReelResult {
  quantite: { prevue: number; reelle: number; ecartPct: number | null };
  ca: { prevu: number; reel: number; ecartPct: number | null };
  benefice: { prevu: number; reelApprox: number; ecartPct: number | null };
}

const ecartPct = (prevu: number, reel: number): number | null => (prevu !== 0 ? ((reel - prevu) / Math.abs(prevu)) * 100 : null);

export const comparePrevisionnelVsReel = (
  inputs: SimulationInputs,
  results: SimulationResults,
  actuals: ActualsInput
): PrevisionnelVsReelResult => {
  const caPrevu = inputs.prixEnvisage * inputs.quantitePrevue;
  const beneficePrevu = results.beneficeUnitaire * inputs.quantitePrevue;
  const beneficeReelApprox = actuals.caReel - results.coutVariableUnitaire * actuals.quantiteReelle - results.chargesFixesTotales;

  return {
    quantite: { prevue: inputs.quantitePrevue, reelle: actuals.quantiteReelle, ecartPct: ecartPct(inputs.quantitePrevue, actuals.quantiteReelle) },
    ca: { prevu: caPrevu, reel: actuals.caReel, ecartPct: ecartPct(caPrevu, actuals.caReel) },
    benefice: { prevu: beneficePrevu, reelApprox: beneficeReelApprox, ecartPct: ecartPct(beneficePrevu, beneficeReelApprox) },
  };
};

// Score de santé financière /100 (2026-09-26, reformulé 2026-09-29 suite à la méthodologie
// communiquée par M. Bamba — voir échange dans JOURNAL.md). Remplace l'ancien "score de
// rentabilité" à 5 critères égaux : la direction préfère parler de SANTÉ FINANCIÈRE (la
// rentabilité ne dépend pas que du CA) et propose une décomposition en 4 dimensions classiques
// d'analyse financière (rentabilité/marges, liquidité/trésorerie, efficacité opérationnelle,
// solvabilité), déclinées ici en 6 postes pondérés reprenant des ratios standards (marge brute,
// DSO, DPO, rotation de stock...).
//
// FORMULE ET SEUILS DE NOTATION : les poids des 6 postes (30/20/15/15/10/10) viennent
// directement de M. Bamba. Les SEUILS DE NOTATION à l'intérieur de chaque poste (ex. "DSO ≤ 30
// jours = note 100") sont en revanche des heuristiques de développement, pas des seuils validés —
// M. Bamba a lui-même proposé de partir sur cette méthodologie pour la V1 puis de l'affiner à
// partir des données réelles. Transparence assumée : le détail par poste (valeur brute + note) est
// toujours renvoyé avec le score, jamais une boîte noire.
//
// LIMITES ASSUMÉES (données non disponibles dans Naatalix à ce stade, cf. JOURNAL.md) :
//  - Marge NETTE / résultat d'exploitation : Naatalix ne trace aucune charge d'exploitation
//    générale (loyer, salaires...), seulement le coût des marchandises vendues (via le stock). Le
//    poste "Rentabilité et marges" ne peut donc reposer que sur la MARGE BRUTE réelle, pas nette.
//  - Coût unitaire au moment de la vente : approximé par le coût moyen pondéré ACTUEL du produit
//    (StockItem.coutMoyenPondere), pas le coût réellement en vigueur au moment de chaque vente
//    passée (Naatalix ne conserve pas d'historique de coût daté).
//  - "Objectifs de CA" : nécessite que l'entreprise ait renseigné un objectif mensuel
//    (Company.objectifCaMensuelFcfa) ; sans lui, ce sous-critère retombe sur la note de croissance
//    du CA plutôt que de pénaliser l'entreprise pour une donnée qu'elle n'a pas fournie.
//  - Seuils paramétrables par secteur d'activité / taille d'entreprise : pas encore implémenté
//    (même seuils pour toutes les entreprises) — reporté à une itération ultérieure, comme suggéré
//    par M. Bamba lui-même.
export interface FinancialHealthInputs {
  margeBrutePct: number; // Rentabilité et marges (30%) — (CA HT vendu - coût correspondant) / CA HT × 100
  ratioLiquiditePct: number; // Liquidité/trésorerie (20%) — créances à court terme / dettes fournisseurs à court terme × 100
  tauxImpayesPct: number; // Créances clients — % du CA en factures impayées/en retard
  dsoJours: number; // Créances clients — Days Sales Outstanding (délai moyen d'encaissement)
  croissanceCaPct: number; // Performance du CA — évolution vs période précédente
  objectifCaAtteintPct: number | null; // Performance du CA — % de l'objectif mensuel atteint (null = objectif non défini)
  rotationStock: number; // Gestion des stocks — coût des ventes du mois / valeur du stock (ratio mensuel, pas annualisé)
  pctStockDormant: number; // Gestion des stocks — % du stock sans sortie depuis 90 jours
  dpoJours: number; // Dettes et fournisseurs — Days Payable Outstanding (délai moyen de paiement)
  tauxEcheancesRespecteesPct: number; // Dettes et fournisseurs — % de dettes fournisseurs non dépassées
}

export interface FinancialHealthDetail {
  dimension: string;
  poids: number;
  note: number;
  sousIndicateurs: Array<{ nom: string; valeurBrute: number | null; note: number }>;
}

export interface FinancialHealthResult {
  score: number;
  details: FinancialHealthDetail[];
}

const clamp = (n: number, min = 0, max = 100): number => Math.max(min, Math.min(max, n));
const moyenne = (notes: number[]): number => notes.reduce((s, n) => s + n, 0) / notes.length;

export const computeFinancialHealthScore = (inputs: FinancialHealthInputs): FinancialHealthResult => {
  // 1. Rentabilité et marges (30%) — 0% → 0, 25% → 50, 50%+ → 100.
  const noteMarge = clamp((inputs.margeBrutePct / 50) * 100);

  // 2. Liquidité et trésorerie (20%) — ratio ≥ 100% (créances ≥ dettes court terme) → note 100.
  const noteLiquidite = clamp(inputs.ratioLiquiditePct);

  // 3. Créances clients (15%) — moyenne du taux d'impayés et du DSO.
  const noteImpayes = clamp(100 - (inputs.tauxImpayesPct / 50) * 100);
  const noteDso = clamp(100 - ((inputs.dsoJours - 30) / 60) * 100); // ≤30j → 100, ≥90j → 0
  const noteCreances = moyenne([noteImpayes, noteDso]);

  // 4. Performance du CA (15%) — moyenne de la croissance et de l'atteinte d'objectif (si défini).
  const noteCroissance = clamp(50 + (inputs.croissanceCaPct / 20) * 50); // -20% → 0, 0% → 50, +20% → 100
  const noteObjectif = inputs.objectifCaAtteintPct === null ? noteCroissance : clamp(inputs.objectifCaAtteintPct);
  const notePerformanceCa = moyenne([noteCroissance, noteObjectif]);

  // 5. Gestion des stocks (10%) — moyenne de la rotation et de l'absence de stock dormant.
  const noteRotation = clamp((inputs.rotationStock / 0.8) * 100); // 0 → 0, 0.8×/mois (~10×/an) → 100
  const noteDormant = clamp(100 - inputs.pctStockDormant);
  const noteStock = moyenne([noteRotation, noteDormant]);

  // 6. Dettes et fournisseurs (10%) — moyenne du DPO et du respect des échéances.
  const noteDpo = inputs.dpoJours <= 30 ? 100 : clamp(100 - ((inputs.dpoJours - 30) / 60) * 100);
  const noteEcheances = clamp(inputs.tauxEcheancesRespecteesPct);
  const noteFournisseurs = moyenne([noteDpo, noteEcheances]);

  const details: FinancialHealthDetail[] = [
    { dimension: 'Rentabilité et marges', poids: 30, note: noteMarge, sousIndicateurs: [
      { nom: 'Marge brute (%)', valeurBrute: inputs.margeBrutePct, note: noteMarge },
    ] },
    { dimension: 'Liquidité et trésorerie', poids: 20, note: noteLiquidite, sousIndicateurs: [
      { nom: 'Ratio de liquidité court terme (%)', valeurBrute: inputs.ratioLiquiditePct, note: noteLiquidite },
    ] },
    { dimension: 'Créances clients', poids: 15, note: noteCreances, sousIndicateurs: [
      { nom: 'Taux d\'impayés (%)', valeurBrute: inputs.tauxImpayesPct, note: noteImpayes },
      { nom: 'Délai moyen d\'encaissement — DSO (jours)', valeurBrute: inputs.dsoJours, note: noteDso },
    ] },
    { dimension: 'Performance du chiffre d\'affaires', poids: 15, note: notePerformanceCa, sousIndicateurs: [
      { nom: 'Croissance du CA (%)', valeurBrute: inputs.croissanceCaPct, note: noteCroissance },
      { nom: 'Atteinte de l\'objectif mensuel (%)', valeurBrute: inputs.objectifCaAtteintPct, note: noteObjectif },
    ] },
    { dimension: 'Gestion des stocks', poids: 10, note: noteStock, sousIndicateurs: [
      { nom: 'Rotation du stock (mensuelle)', valeurBrute: inputs.rotationStock, note: noteRotation },
      { nom: 'Stock dormant (%)', valeurBrute: inputs.pctStockDormant, note: noteDormant },
    ] },
    { dimension: 'Dettes et fournisseurs', poids: 10, note: noteFournisseurs, sousIndicateurs: [
      { nom: 'Délai moyen de paiement — DPO (jours)', valeurBrute: inputs.dpoJours, note: noteDpo },
      { nom: 'Échéances fournisseurs respectées (%)', valeurBrute: inputs.tauxEcheancesRespecteesPct, note: noteEcheances },
    ] },
  ];

  const score = Math.round(details.reduce((sum, d) => sum + (d.note * d.poids) / 100, 0));
  return { score, details };
};

export interface FinancialHealthDescription {
  label: string;
  pointsForts: string[];
  pointsAttention: string[];
}

// Explicabilité (exigée par M. Bamba : "Bonne marge commerciale, mais niveau d'impayés élevé...").
// Règles simples, pas d'IA : label global selon le score, puis les dimensions notées ≥80 (points
// forts) et <50 (points d'attention) sont listées avec une phrase-type par dimension.
const DIMENSION_PHRASES: Record<string, { fort: string; attention: string }> = {
  'Rentabilité et marges': { fort: 'Bonne marge commerciale', attention: 'marge commerciale faible' },
  'Liquidité et trésorerie': { fort: 'Trésorerie à court terme saine', attention: 'risque de tension de trésorerie à court terme' },
  'Créances clients': { fort: 'Bon recouvrement des créances', attention: "niveau d'impayés ou délai d'encaissement élevé" },
  'Performance du chiffre d\'affaires': { fort: 'Chiffre d\'affaires en bonne dynamique', attention: 'chiffre d\'affaires stagnant ou en baisse' },
  'Gestion des stocks': { fort: 'Bonne rotation des stocks', attention: 'rotation des stocks insuffisante ou stock dormant' },
  'Dettes et fournisseurs': { fort: 'Bonnes relations fournisseurs', attention: 'retards de paiement fournisseurs' },
};

export const describeFinancialHealth = (result: FinancialHealthResult): FinancialHealthDescription => {
  const label = result.score >= 80 ? 'Excellente situation financière'
    : result.score >= 65 ? 'Situation financière satisfaisante'
    : result.score >= 50 ? 'Situation financière fragile'
    : 'Situation financière préoccupante';

  const pointsForts = result.details
    .filter((d) => d.note >= 80)
    .map((d) => DIMENSION_PHRASES[d.dimension]?.fort || d.dimension);
  const pointsAttention = result.details
    .filter((d) => d.note < 50)
    .map((d) => DIMENSION_PHRASES[d.dimension]?.attention || d.dimension);

  return { label, pointsForts, pointsAttention };
};
