import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { ProfitabilitySimulation } from '../models/ProfitabilitySimulation';
import { ProfitabilityCost } from '../models/ProfitabilityCost';
import { Product } from '../models/Product';
import { Supplier } from '../models/Supplier';
import { SupplierProduct } from '../models/SupplierProduct';
import {
  computeResults,
  applyScenario,
  computeSensitivity,
  computeDiscountSimulation,
  computeTargetProfit,
  CostLine,
  SimulationInputs,
  SensitivityParameter,
} from '../services/profitabilityCalculationService';

const NATURES = ['produit', 'service', 'projet', 'commerce', 'production', 'importation', 'transformation', 'prestation', 'autre'] as const;
const COST_CATEGORIES = ['achat_production', 'transport_logistique', 'frais_paiement', 'marketing', 'rh_fiscal', 'autre'] as const;

const toInputs = (sim: ProfitabilitySimulation): SimulationInputs => ({
  prixEnvisage: sim.prixEnvisage,
  quantitePrevue: sim.quantitePrevue,
  margeCibleType: sim.margeCibleType,
  margeCiblePct: sim.margeCiblePct,
  margePremiumBonusPct: sim.margePremiumBonusPct,
  investissementInitial: sim.investissementInitial,
});

const toCostLines = (costs: ProfitabilityCost[]): CostLine[] => costs.map((c) => ({ montant: c.montant, type: c.type }));

// Point d'écriture unique des résultats calculés — recharge les coûts, appelle le moteur de
// calcul pur, puis persiste le résultat sur la simulation (mêmes principes que
// quoteController.recalculateQuoteTotals).
const recalculateSimulation = async (simulation: ProfitabilitySimulation): Promise<void> => {
  const costs = await ProfitabilityCost.findAll({ where: { simulationId: simulation.id } });
  const results = computeResults(toInputs(simulation), toCostLines(costs));

  simulation.coutVariableUnitaire = results.coutVariableUnitaire;
  simulation.chargesFixesTotales = results.chargesFixesTotales;
  simulation.coutCompletUnitaire = results.coutCompletUnitaire;
  simulation.beneficeUnitaire = results.beneficeUnitaire;
  simulation.tauxMarge = results.tauxMarge;
  simulation.tauxMarque = results.tauxMarque;
  simulation.coutMaximalAcceptable = results.coutMaximalAcceptable;
  simulation.prixPlancher = results.prixPlancher;
  simulation.prixMinimumRecommande = results.prixMinimumRecommande;
  simulation.prixPremium = results.prixPremium;
  simulation.seuilRentabiliteCA = results.seuilRentabiliteCA;
  simulation.seuilRentabiliteVolume = results.seuilRentabiliteVolume;
  simulation.roiPct = results.roiPct;
  simulation.statutRentabilite = results.statutRentabilite;
  await simulation.save();
};

// POST /api/v1/crm/profitability/simulations
export const createSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const {
      nom, nature, productId, secteur, devise, periode, dateLancement, quantitePrevue, unite,
      prixMarcheMin, prixMarcheMoyen, prixMarcheMax, prixEnvisage,
      margeCibleType, margeCiblePct, margePremiumBonusPct, investissementInitial,
      couts,
    } = req.body;

    if (!nom) { res.status(400).json({ error: 'nom requis.' }); return; }
    if (nature && !NATURES.includes(nature)) {
      res.status(400).json({ error: `nature invalide. Valeurs acceptées : ${NATURES.join(', ')}` });
      return;
    }

    if (productId) {
      const product = await Product.findOne({ where: { id: Number(productId), companyId } });
      if (!product) { res.status(404).json({ error: 'Produit/service introuvable.' }); return; }
    }

    const simulation = await ProfitabilitySimulation.create({
      companyId,
      nom,
      nature: nature || 'produit',
      productId: productId || null,
      secteur: secteur || null,
      devise: devise || 'FCFA',
      periode: periode || 'mois',
      dateLancement: dateLancement || null,
      quantitePrevue: quantitePrevue !== undefined ? Number(quantitePrevue) : 0,
      unite: unite || null,
      prixMarcheMin: prixMarcheMin ?? null,
      prixMarcheMoyen: prixMarcheMoyen ?? null,
      prixMarcheMax: prixMarcheMax ?? null,
      prixEnvisage: prixEnvisage !== undefined ? Number(prixEnvisage) : 0,
      margeCibleType: margeCibleType || 'marque',
      margeCiblePct: margeCiblePct !== undefined ? Number(margeCiblePct) : 30,
      margePremiumBonusPct: margePremiumBonusPct !== undefined ? Number(margePremiumBonusPct) : 20,
      investissementInitial: investissementInitial ?? null,
      createdByUserId: req.user!.id,
    });

    if (Array.isArray(couts) && couts.length > 0) {
      for (const c of couts) {
        if (!c.type || (c.type !== 'fixe' && c.type !== 'variable')) continue;
        await ProfitabilityCost.create({
          simulationId: simulation.id,
          categorie: COST_CATEGORIES.includes(c.categorie) ? c.categorie : 'autre',
          libelle: c.libelle || c.categorie || 'Coût',
          montant: Number(c.montant) || 0,
          type: c.type,
        });
      }
    }

    await recalculateSimulation(simulation);

    const full = await ProfitabilitySimulation.findByPk(simulation.id, { include: [{ model: ProfitabilityCost, as: 'couts' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur createSimulation :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de la simulation.' });
  }
};

// GET /api/v1/crm/profitability/simulations?statut=&nature=&search=&page=&limit=
export const listSimulations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { statut, nature, search, page = 1, limit = 20 } = req.query;

    const where: any = { companyId };
    where.statut = (statut === 'active' || statut === 'archivee') ? statut : 'active';
    if (nature && NATURES.includes(nature as any)) where.nature = nature;
    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      where.nom = { [likeOp]: `%${String(search).trim()}%` };
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await ProfitabilitySimulation.findAndCountAll({
      where, limit: Number(limit), offset, order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listSimulations :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/profitability/simulations/:id
export const getSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await ProfitabilitySimulation.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [{ model: ProfitabilityCost, as: 'couts' }, { model: Product, as: 'product', attributes: ['id', 'nom'] }],
    });
    if (!simulation) { res.status(404).json({ error: 'Simulation introuvable.' }); return; }
    res.status(200).json(simulation);
  } catch (error) {
    console.error('Erreur getSimulation :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const findSimulation = async (req: AuthenticatedRequest, res: Response): Promise<ProfitabilitySimulation | null> => {
  const simulation = await ProfitabilitySimulation.findOne({ where: { id: Number(req.params.id), companyId: req.user!.companyId! } });
  if (!simulation) { res.status(404).json({ error: 'Simulation introuvable.' }); return null; }
  return simulation;
};

// PUT /api/v1/crm/profitability/simulations/:id — toute modification d'hypothèse recalcule les
// indicateurs dépendants (règle explicite du cahier des charges §38).
export const updateSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const fields = [
      'nom', 'nature', 'secteur', 'devise', 'periode', 'dateLancement', 'quantitePrevue', 'unite',
      'prixMarcheMin', 'prixMarcheMoyen', 'prixMarcheMax', 'prixEnvisage',
      'margeCibleType', 'margeCiblePct', 'margePremiumBonusPct', 'investissementInitial',
    ] as const;

    if (req.body.nature && !NATURES.includes(req.body.nature)) {
      res.status(400).json({ error: `nature invalide. Valeurs acceptées : ${NATURES.join(', ')}` });
      return;
    }

    for (const field of fields) {
      if (req.body[field] !== undefined) (simulation as any)[field] = req.body[field];
    }
    await simulation.save();
    await recalculateSimulation(simulation);

    res.status(200).json(simulation);
  } catch (error) {
    console.error('Erreur updateSimulation :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/profitability/simulations/:id/archive
export const archiveSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;
    simulation.statut = 'archivee';
    await simulation.save();
    res.status(200).json(simulation);
  } catch (error) {
    console.error('Erreur archiveSimulation :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/crm/profitability/simulations/:id/restore
export const restoreSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;
    simulation.statut = 'active';
    await simulation.save();
    res.status(200).json(simulation);
  } catch (error) {
    console.error('Erreur restoreSimulation :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/profitability/simulations/:id/duplicate — §27 : dupliquer une simulation.
export const duplicateSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const original = await ProfitabilitySimulation.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
      include: [{ model: ProfitabilityCost, as: 'couts' }],
    });
    if (!original) { res.status(404).json({ error: 'Simulation introuvable.' }); return; }

    const data = original.toJSON();
    delete data.id;
    delete data.createdAt;
    delete data.updatedAt;
    const originalCosts = data.couts as ProfitabilityCost[];
    delete data.couts;

    const copy = await ProfitabilitySimulation.create({
      ...data,
      nom: `${original.nom} (copie)`,
      statut: 'active',
      createdByUserId: req.user!.id,
    });

    for (const c of originalCosts || []) {
      await ProfitabilityCost.create({
        simulationId: copy.id,
        categorie: c.categorie,
        libelle: c.libelle,
        montant: c.montant,
        type: c.type,
      });
    }
    await recalculateSimulation(copy);

    const full = await ProfitabilitySimulation.findByPk(copy.id, { include: [{ model: ProfitabilityCost, as: 'couts' }] });
    res.status(201).json(full);
  } catch (error) {
    console.error('Erreur duplicateSimulation :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la duplication.' });
  }
};

// --- Coûts ---

// POST /api/v1/crm/profitability/simulations/:id/costs
export const addCost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const { categorie, libelle, montant, type } = req.body;
    if (!libelle || !type || (type !== 'fixe' && type !== 'variable')) {
      res.status(400).json({ error: "libelle et type ('fixe' ou 'variable') sont requis." });
      return;
    }

    const cost = await ProfitabilityCost.create({
      simulationId: simulation.id,
      categorie: COST_CATEGORIES.includes(categorie) ? categorie : 'autre',
      libelle,
      montant: Number(montant) || 0,
      type,
    });
    await recalculateSimulation(simulation);

    res.status(201).json(cost);
  } catch (error) {
    console.error('Erreur addCost :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/profitability/simulations/:id/costs/:costId
export const updateCost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const cost = await ProfitabilityCost.findOne({ where: { id: Number(req.params.costId), simulationId: simulation.id } });
    if (!cost) { res.status(404).json({ error: 'Ligne de coût introuvable.' }); return; }

    const { categorie, libelle, montant, type } = req.body;
    if (type !== undefined && type !== 'fixe' && type !== 'variable') {
      res.status(400).json({ error: "type invalide ('fixe' ou 'variable')." });
      return;
    }
    if (categorie !== undefined) cost.categorie = COST_CATEGORIES.includes(categorie) ? categorie : 'autre';
    if (libelle !== undefined) cost.libelle = libelle;
    if (montant !== undefined) cost.montant = Number(montant);
    if (type !== undefined) cost.type = type;
    await cost.save();
    await recalculateSimulation(simulation);

    res.status(200).json(cost);
  } catch (error) {
    console.error('Erreur updateCost :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/profitability/simulations/:id/costs/:costId
export const deleteCost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const cost = await ProfitabilityCost.findOne({ where: { id: Number(req.params.costId), simulationId: simulation.id } });
    if (!cost) { res.status(404).json({ error: 'Ligne de coût introuvable.' }); return; }

    await cost.destroy();
    await recalculateSimulation(simulation);

    res.status(200).json({ message: 'Ligne de coût supprimée.', simulation });
  } catch (error) {
    console.error('Erreur deleteCost :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Analyses ---

// POST /api/v1/crm/profitability/simulations/:id/target-profit — "Je veux gagner X FCFA"
export const targetProfit = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const { objectifBenefice, periode } = req.body;
    const objectifNumber = Number(objectifBenefice);
    if (!objectifNumber || objectifNumber <= 0) {
      res.status(400).json({ error: 'objectifBenefice requis et strictement positif.' });
      return;
    }

    const result = computeTargetProfit(objectifNumber, simulation.beneficeUnitaire, simulation.prixEnvisage, periode || simulation.periode);
    if (!result) {
      res.status(400).json({
        error: 'Le bénéfice unitaire actuel est nul ou négatif : aucun volume ne permet d\'atteindre cet objectif en l\'état. Ajustez le prix ou les coûts avant de recalculer.',
      });
      return;
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Erreur targetProfit :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/profitability/simulations/:id/scenarios — prudent / réaliste / optimiste
export const getScenarios = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const costs = await ProfitabilityCost.findAll({ where: { simulationId: simulation.id } });
    const inputs = toInputs(simulation);
    const costLines = toCostLines(costs);

    res.status(200).json({
      prudent: applyScenario(inputs, costLines, 'prudent'),
      realiste: applyScenario(inputs, costLines, 'realiste'),
      optimiste: applyScenario(inputs, costLines, 'optimiste'),
    });
  } catch (error) {
    console.error('Erreur getScenarios :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const SENSITIVITY_PARAMETERS: SensitivityParameter[] = ['prix', 'quantite', 'coutVariable', 'chargesFixes'];

// POST /api/v1/crm/profitability/simulations/:id/sensitivity
export const sensitivityAnalysis = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const { parametre, variationsPct } = req.body;
    if (!SENSITIVITY_PARAMETERS.includes(parametre)) {
      res.status(400).json({ error: `parametre invalide. Valeurs acceptées : ${SENSITIVITY_PARAMETERS.join(', ')}` });
      return;
    }
    const variations = Array.isArray(variationsPct) && variationsPct.length > 0
      ? variationsPct.map(Number)
      : [-20, -10, 0, 10, 20];

    const costs = await ProfitabilityCost.findAll({ where: { simulationId: simulation.id } });
    const results = computeSensitivity(toInputs(simulation), toCostLines(costs), parametre, variations);

    res.status(200).json({ parametre, results });
  } catch (error) {
    console.error('Erreur sensitivityAnalysis :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/crm/profitability/simulations/:id/discount-simulation
export const discountSimulation = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    const { tauxRemisePcts } = req.body;
    const taux = Array.isArray(tauxRemisePcts) && tauxRemisePcts.length > 0
      ? tauxRemisePcts.map(Number)
      : [5, 10, 15, 20];

    const costs = await ProfitabilityCost.findAll({ where: { simulationId: simulation.id } });
    const results = computeDiscountSimulation(toInputs(simulation), toCostLines(costs), taux);

    res.status(200).json({ results });
  } catch (error) {
    console.error('Erreur discountSimulation :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/profitability/simulations/compare?ids=1,2,3 — §27 : comparaison de simulations
export const compareSimulations = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const idsParam = String(req.query.ids || '');
    const ids = idsParam.split(',').map((s) => Number(s.trim())).filter((n) => !isNaN(n));
    if (ids.length === 0) { res.status(400).json({ error: 'ids requis (liste séparée par des virgules).' }); return; }

    const simulations = await ProfitabilitySimulation.findAll({ where: { id: { [Op.in]: ids }, companyId } });
    res.status(200).json(simulations);
  } catch (error) {
    console.error('Erreur compareSimulations :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/profitability/supplier-comparison?productId= — §28 : comparateur fournisseurs,
// réutilise SupplierProduct (module Fournisseurs) plutôt que de dupliquer une saisie de prix.
export const supplierComparison = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const productId = Number(req.query.productId);
    if (!productId) { res.status(400).json({ error: 'productId requis.' }); return; }

    const product = await Product.findOne({ where: { id: productId, companyId } });
    if (!product) { res.status(404).json({ error: 'Produit/service introuvable.' }); return; }

    const links = await SupplierProduct.findAll({
      where: { companyId, productId },
      include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'nom', 'statut'] }],
      order: [['prixAchat', 'ASC']],
    });

    res.status(200).json({
      product: { id: product.id, nom: product.nom },
      fournisseurs: links,
      moinsCher: links[0] || null,
    });
  } catch (error) {
    console.error('Erreur supplierComparison :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
