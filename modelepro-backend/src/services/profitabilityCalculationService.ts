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
