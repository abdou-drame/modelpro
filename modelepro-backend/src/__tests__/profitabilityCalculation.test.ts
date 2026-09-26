import {
  computeResults,
  applyScenario,
  computeSensitivity,
  computeDiscountSimulation,
  computeTargetProfit,
  comparePrevisionnelVsReel,
  computeProfitabilityScore,
  CostLine,
  SimulationInputs,
} from '../services/profitabilityCalculationService';

// Tests unitaires purs (pas de DB, pas d'API) des formules financières du module Rentabilité —
// cf. Cahier_des_charges_Module_Naatalix_Rentabilite.docx §44 ("Tests unitaires des formules
// financières et des arrondis"). Les exemples chiffrés reproduisent ceux du cahier des charges.

describe('profitabilityCalculationService — computeResults', () => {
  const baseInputs: SimulationInputs = {
    prixEnvisage: 10000,
    quantitePrevue: 1,
    margeCibleType: 'marque',
    margeCiblePct: 30,
    margePremiumBonusPct: 20,
    investissementInitial: null,
  };

  it('exemple §41 : coût total unitaire et marge sur CA à partir de coûts 100% variables', () => {
    const costs: CostLine[] = [
      { montant: 5000, type: 'variable' }, // achat
      { montant: 500, type: 'variable' },  // transport
      { montant: 200, type: 'variable' },  // emballage
      { montant: 200, type: 'variable' },  // commission paiement
      { montant: 300, type: 'variable' },  // marketing
    ];
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000 }, costs);

    expect(results.coutVariableUnitaire).toBe(6200);
    expect(results.chargesFixesTotales).toBe(0);
    expect(results.coutCompletUnitaire).toBe(6200);
    expect(results.beneficeUnitaire).toBe(3800);
    expect(results.tauxMarque).toBeCloseTo(38, 5);
  });

  it('exemple §11.1 : coût maximal acceptable = prix × (1 - marge cible)', () => {
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000, margeCiblePct: 30 }, []);
    expect(results.coutMaximalAcceptable).toBe(7000);
  });

  it('exemple §11.2 : prix minimum = coût / (1 - marge cible), cohérent avec le coût maximal', () => {
    // Un coût complet de 7000 (2 coûts variables) avec une marge cible de 30% doit redonner 10000.
    const costs: CostLine[] = [{ montant: 7000, type: 'variable' }];
    const results = computeResults({ ...baseInputs, margeCiblePct: 30 }, costs);
    expect(results.prixMinimumRecommande).toBe(10000);
  });

  it('exemple §42 : coût maximal recalculé pour une marge cible de 40 %', () => {
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000, margeCiblePct: 40 }, []);
    expect(results.coutMaximalAcceptable).toBe(6000);
  });

  it('répartit les charges fixes sur la quantité prévue', () => {
    const costs: CostLine[] = [
      { montant: 2000, type: 'variable' },
      { montant: 50000, type: 'fixe' },
    ];
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000, quantitePrevue: 100 }, costs);
    expect(results.chargesFixesTotales).toBe(50000);
    expect(results.coutCompletUnitaire).toBe(2000 + 500); // 50000/100 = 500 de quote-part
  });

  it('calcule le seuil de rentabilité en CA et en volume', () => {
    const costs: CostLine[] = [
      { montant: 4000, type: 'variable' },
      { montant: 60000, type: 'fixe' },
    ];
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000, quantitePrevue: 100 }, costs);
    // taux marge sur coûts variables = (10000-4000)/10000 = 0.6 ; seuil CA = 60000/0.6 = 100000
    expect(results.seuilRentabiliteCA).toBeCloseTo(100000, 5);
    expect(results.seuilRentabiliteVolume).toBeCloseTo(10, 5); // 100000 / 10000
  });

  it('statut ROUGE si bénéfice unitaire négatif ou nul (vente à perte)', () => {
    const costs: CostLine[] = [{ montant: 12000, type: 'variable' }];
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000 }, costs);
    expect(results.beneficeUnitaire).toBeLessThan(0);
    expect(results.statutRentabilite).toBe('rouge');
  });

  it('statut ORANGE si bénéficiaire mais sous la marge cible', () => {
    const costs: CostLine[] = [{ montant: 8000, type: 'variable' }]; // marge 20% < cible 30%
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000, margeCiblePct: 30 }, costs);
    expect(results.beneficeUnitaire).toBeGreaterThan(0);
    expect(results.tauxMarque).toBeLessThan(30);
    expect(results.statutRentabilite).toBe('orange');
  });

  it('statut VERT si la marge cible est atteinte ou dépassée', () => {
    const costs: CostLine[] = [{ montant: 6000, type: 'variable' }]; // marge 40% >= cible 30%
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000, margeCiblePct: 30 }, costs);
    expect(results.statutRentabilite).toBe('vert');
  });

  it('calcule le ROI à partir du bénéfice total de la période et de l’investissement initial', () => {
    const costs: CostLine[] = [{ montant: 6000, type: 'variable' }];
    const results = computeResults({ ...baseInputs, prixEnvisage: 10000, quantitePrevue: 50, investissementInitial: 100000 }, costs);
    // bénéfice unitaire 4000 * 50 ventes = 200000 ; ROI = 200000/100000*100 = 200%
    expect(results.roiPct).toBeCloseTo(200, 5);
  });

  it('roiPct est null sans investissement initial renseigné', () => {
    const results = computeResults({ ...baseInputs, investissementInitial: null }, []);
    expect(results.roiPct).toBeNull();
  });
});

describe('profitabilityCalculationService — applyScenario', () => {
  const inputs: SimulationInputs = {
    prixEnvisage: 10000,
    quantitePrevue: 100,
    margeCibleType: 'marque',
    margeCiblePct: 30,
    margePremiumBonusPct: 20,
    investissementInitial: null,
  };
  const costs: CostLine[] = [{ montant: 4000, type: 'variable' }];

  it('scénario prudent : ventes -30 %, coûts variables +10 %', () => {
    const result = applyScenario(inputs, costs, 'prudent');
    expect(result.quantiteAjustee).toBeCloseTo(70, 5);
    expect(result.coutVariableUnitaire).toBeCloseTo(4400, 5);
  });

  it('scénario optimiste : ventes +30 %, coûts stables', () => {
    const result = applyScenario(inputs, costs, 'optimiste');
    expect(result.quantiteAjustee).toBeCloseTo(130, 5);
    expect(result.coutVariableUnitaire).toBeCloseTo(4000, 5);
  });

  it('scénario réaliste : hypothèses inchangées', () => {
    const result = applyScenario(inputs, costs, 'realiste');
    expect(result.quantiteAjustee).toBe(100);
    expect(result.coutVariableUnitaire).toBe(4000);
  });
});

describe('profitabilityCalculationService — computeSensitivity', () => {
  const inputs: SimulationInputs = {
    prixEnvisage: 10000,
    quantitePrevue: 100,
    margeCibleType: 'marque',
    margeCiblePct: 30,
    margePremiumBonusPct: 20,
    investissementInitial: null,
  };
  const costs: CostLine[] = [{ montant: 4000, type: 'variable' }];

  it('fait varier le prix et recalcule le bénéfice pour chaque variation', () => {
    const results = computeSensitivity(inputs, costs, 'prix', [-10, 0, 10]);
    expect(results).toHaveLength(3);
    expect(results[0].variationPct).toBe(-10);
    expect(results[0].beneficeUnitaire).toBeCloseTo(9000 - 4000, 5); // prix -10% = 9000
    expect(results[2].beneficeUnitaire).toBeCloseTo(11000 - 4000, 5);
  });

  it('fait varier le coût d’achat fournisseur de +10 % (cas d’usage §16)', () => {
    const results = computeSensitivity(inputs, costs, 'coutVariable', [10]);
    expect(results[0].coutVariableUnitaire).toBeCloseTo(4400, 5);
    expect(results[0].beneficeUnitaire).toBeCloseTo(10000 - 4400, 5);
  });
});

describe('profitabilityCalculationService — computeDiscountSimulation', () => {
  const inputs: SimulationInputs = {
    prixEnvisage: 10000,
    quantitePrevue: 100,
    margeCibleType: 'marque',
    margeCiblePct: 30,
    margePremiumBonusPct: 20,
    investissementInitial: null,
  };
  const costs: CostLine[] = [{ montant: 6000, type: 'variable' }]; // marge de base 40%

  it('simule plusieurs taux de remise et signale le passage sous la marge cible / le seuil de perte', () => {
    const results = computeDiscountSimulation(inputs, costs, [5, 10, 40]);
    const r5 = results.find((r) => r.tauxRemisePct === 5)!;
    const r40 = results.find((r) => r.tauxRemisePct === 40)!;

    expect(r5.prixApresRemise).toBe(9500);
    expect(r5.sousLaMargeCible).toBe(false); // 9500-6000=3500 / 9500 ≈ 36.8% > 30%

    expect(r40.prixApresRemise).toBe(6000);
    expect(r40.beneficeUnitaire).toBe(0);
    expect(r40.sousLeSeuilDeRentabilite).toBe(true); // bénéfice nul = vente à perte (seuil atteint)
  });
});

describe('profitabilityCalculationService — computeTargetProfit', () => {
  it('exemple §13 : "Je veux gagner 1 000 000 FCFA/mois" avec un bénéfice unitaire de 5000', () => {
    const result = computeTargetProfit(1000000, 5000, 10000, 'mois');
    expect(result).not.toBeNull();
    expect(result!.ventesNecessaires).toBe(200);
    expect(result!.caNecessaire).toBe(2000000);
    expect(result!.ventesParJour).toBeCloseTo(6.67, 1); // ≈ 7 ventes/jour (cahier des charges)
    expect(result!.ventesParSemaine).toBeCloseTo(46.67, 1); // ≈ 50 ventes/semaine (cahier des charges)
  });

  it('retourne null si le bénéfice unitaire est nul ou négatif (objectif inatteignable en l’état)', () => {
    expect(computeTargetProfit(1000000, 0, 10000, 'mois')).toBeNull();
    expect(computeTargetProfit(1000000, -500, 10000, 'mois')).toBeNull();
  });
});

describe('profitabilityCalculationService — comparePrevisionnelVsReel', () => {
  const inputs: SimulationInputs = {
    prixEnvisage: 10000,
    quantitePrevue: 100,
    margeCibleType: 'marque',
    margeCiblePct: 30,
    margePremiumBonusPct: 20,
    investissementInitial: null,
  };
  const costs: CostLine[] = [{ montant: 6000, type: 'variable' }, { montant: 50000, type: 'fixe' }];
  const results = computeResults(inputs, costs);
  // coutVariableUnitaire = 6000, chargesFixesTotales = 50000, beneficeUnitaire = 10000 - 6000 - 500 = 3500

  it('quantité et CA réels supérieurs au prévu : écarts positifs', () => {
    const cmp = comparePrevisionnelVsReel(inputs, results, { quantiteReelle: 120, caReel: 1300000 });
    expect(cmp.quantite.prevue).toBe(100);
    expect(cmp.quantite.reelle).toBe(120);
    expect(cmp.quantite.ecartPct).toBeCloseTo(20, 5);
    expect(cmp.ca.prevu).toBe(1000000); // 10000 * 100
    expect(cmp.ca.ecartPct).toBeCloseTo(30, 5); // (1300000-1000000)/1000000
    // bénéfice réel approx = 1300000 - 6000*120 - 50000 = 1300000 - 720000 - 50000 = 530000
    expect(cmp.benefice.reelApprox).toBe(530000);
    expect(cmp.benefice.prevu).toBe(350000); // beneficeUnitaire(3500) * 100
  });

  it('quantité réelle nulle : CA et bénéfice réels nuls, écarts négatifs à -100%', () => {
    const cmp = comparePrevisionnelVsReel(inputs, results, { quantiteReelle: 0, caReel: 0 });
    expect(cmp.quantite.ecartPct).toBeCloseTo(-100, 5);
    expect(cmp.ca.ecartPct).toBeCloseTo(-100, 5);
    expect(cmp.benefice.reelApprox).toBe(-50000); // 0 - 0 - chargesFixesTotales
  });

  it('valeur prévue nulle : écart en pourcentage non défini (null), pas une division par zéro', () => {
    const cmp = comparePrevisionnelVsReel({ ...inputs, quantitePrevue: 0 }, results, { quantiteReelle: 10, caReel: 100000 });
    expect(cmp.quantite.ecartPct).toBeNull();
    expect(cmp.ca.ecartPct).toBeNull();
  });
});

describe('profitabilityCalculationService — computeProfitabilityScore', () => {
  it('toutes les notes au maximum → score de 100, détail complet renvoyé', () => {
    const result = computeProfitabilityScore({
      croissanceCaPct: 20,
      ratioCreancesSurCAPct: 0,
      pctSimulationsRentables: 100,
      pctStockSain: 100,
      pctEcheancesFournisseursRespectees: 100,
    });
    expect(result.score).toBe(100);
    expect(result.details).toHaveLength(5);
    expect(result.details.reduce((s, d) => s + d.poids, 0)).toBe(100);
  });

  it('toutes les notes au pire → score de 0', () => {
    const result = computeProfitabilityScore({
      croissanceCaPct: -20,
      ratioCreancesSurCAPct: 50,
      pctSimulationsRentables: 0,
      pctStockSain: 0,
      pctEcheancesFournisseursRespectees: 0,
    });
    expect(result.score).toBe(0);
  });

  it('situation neutre (croissance nulle, aucune créance, reste à 50%) → score autour de 50', () => {
    const result = computeProfitabilityScore({
      croissanceCaPct: 0,
      ratioCreancesSurCAPct: 0,
      pctSimulationsRentables: 50,
      pctStockSain: 50,
      pctEcheancesFournisseursRespectees: 50,
    });
    // croissance→50, créances→100, simulations→50, stock→50, fournisseurs→50
    // = 50*0.25 + 100*0.25 + 50*0.20 + 50*0.15 + 50*0.15 = 12.5+25+10+7.5+7.5 = 62.5 → arrondi 63
    expect(result.score).toBe(63);
  });

  it('les valeurs hors bornes sont ramenées entre 0 et 100 (pas de score négatif ou > 100)', () => {
    const result = computeProfitabilityScore({
      croissanceCaPct: 500,
      ratioCreancesSurCAPct: -10,
      pctSimulationsRentables: 200,
      pctStockSain: -5,
      pctEcheancesFournisseursRespectees: 150,
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    for (const d of result.details) {
      expect(d.note).toBeGreaterThanOrEqual(0);
      expect(d.note).toBeLessThanOrEqual(100);
    }
  });
});
