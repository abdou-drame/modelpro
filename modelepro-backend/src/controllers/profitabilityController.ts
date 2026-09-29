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
  comparePrevisionnelVsReel,
  computeProfitabilityScore,
  CostLine,
  SimulationInputs,
  SimulationResults,
  SensitivityParameter,
} from '../services/profitabilityCalculationService';
import { Invoice } from '../models/Invoice';
import { InvoiceLine } from '../models/InvoiceLine';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { StockItem } from '../models/StockItem';

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

// Reconstruit un SimulationResults à partir des champs mis en cache sur le modèle (source unique
// déjà maintenue par recalculateSimulation) — évite de refaire tourner computeResults ici.
const toResults = (sim: ProfitabilitySimulation): SimulationResults => ({
  coutVariableUnitaire: sim.coutVariableUnitaire,
  chargesFixesTotales: sim.chargesFixesTotales,
  coutCompletUnitaire: sim.coutCompletUnitaire,
  beneficeUnitaire: sim.beneficeUnitaire,
  tauxMarge: sim.tauxMarge,
  tauxMarque: sim.tauxMarque,
  coutMaximalAcceptable: sim.coutMaximalAcceptable,
  prixPlancher: sim.prixPlancher,
  prixMinimumRecommande: sim.prixMinimumRecommande,
  prixPremium: sim.prixPremium,
  seuilRentabiliteCA: sim.seuilRentabiliteCA,
  seuilRentabiliteVolume: sim.seuilRentabiliteVolume,
  roiPct: sim.roiPct,
  statutRentabilite: sim.statutRentabilite,
});

// GET /api/v1/crm/profitability/simulations/:id/previsionnel-vs-reel — rentabilité avancée
// (2026-09-26). Ne fonctionne que pour une simulation liée à un produit du catalogue (productId) :
// sans lien, aucune vente réelle n'est automatiquement rattachable. Les ventes réelles sont
// mesurées sur les factures ENVOYÉES (pas les brouillons) depuis dateLancement (ou la création de
// la simulation si non renseignée) jusqu'à maintenant — voir comparePrevisionnelVsReel pour la
// limite assumée sur le "bénéfice réel" (approximation, pas un coût réellement constaté).
export const getPrevisionnelVsReel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const simulation = await findSimulation(req, res);
    if (!simulation) return;

    if (!simulation.productId) {
      res.status(400).json({ error: 'Cette simulation n\'est liée à aucun produit du catalogue : impossible de retrouver ses ventes réelles automatiquement.' });
      return;
    }

    const depuis = simulation.dateLancement ? new Date(simulation.dateLancement) : simulation.createdAt;
    const invoices = await Invoice.findAll({
      where: { companyId: simulation.companyId, type: 'facture', statut: 'envoyee', dateEmission: { [Op.gte]: depuis } },
      attributes: ['id'],
    });
    const invoiceIds = invoices.map((i) => i.id);
    const lines = invoiceIds.length
      ? await InvoiceLine.findAll({ where: { invoiceId: { [Op.in]: invoiceIds }, productId: simulation.productId } })
      : [];

    const quantiteReelle = lines.reduce((sum, l) => sum + l.quantite, 0);
    const caReel = lines.reduce((sum, l) => sum + l.quantite * l.prixUnitaire * (1 - l.remisePct / 100), 0);

    const comparaison = comparePrevisionnelVsReel(toInputs(simulation), toResults(simulation), { quantiteReelle, caReel });
    res.status(200).json({ depuis: depuis.toISOString(), ...comparaison });
  } catch (error) {
    console.error('Erreur getPrevisionnelVsReel :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/profitability/tresorerie?semaines=&soldeActuel= — rentabilité avancée
// (2026-09-26). Projette les encaissements (factures envoyées non soldées) et décaissements
// (commandes fournisseur non soldées) à venir, semaine par semaine. `soldeActuel` (optionnel,
// défaut 0) permet d'obtenir un solde cumulé projeté — Naatalix ne suit aucun compte
// bancaire/caisse : sans cette valeur, seul le flux NET par semaine est significatif, pas un solde
// absolu. Les échéances déjà dépassées sont regroupées dans le premier bucket ("en retard").
export const getTresorerie = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const nbSemaines = Math.min(Math.max(Number(req.query.semaines) || 8, 1), 26);
    const soldeActuel = Number(req.query.soldeActuel) || 0;
    const now = new Date();

    const [creances, dettes] = await Promise.all([
      Invoice.findAll({ where: { companyId, type: 'facture', statut: 'envoyee', paymentStatus: { [Op.ne]: 'payee' } } }),
      PurchaseOrder.findAll({ where: { companyId, statut: { [Op.in]: ['envoyee', 'confirmee', 'recue'] }, soldeRestant: { [Op.gt]: 0 } } }),
    ]);

    const semaineIndex = (date: Date | null): number => {
      if (!date) return 0; // pas d'échéance connue : traité comme déjà en retard (à traiter en priorité)
      const jours = Math.floor((new Date(date).getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      if (jours < 0) return 0; // en retard
      return Math.min(Math.floor(jours / 7) + 1, nbSemaines); // 1 = semaine en cours, etc. ; au-delà : dernier bucket "et après"
    };

    const buckets = Array.from({ length: nbSemaines + 1 }, () => ({ encaissements: 0, decaissements: 0 }));
    for (const inv of creances) buckets[semaineIndex(inv.dateEcheance)].encaissements += inv.soldeRestant;
    for (const po of dettes) buckets[semaineIndex(po.dateEcheance)].decaissements += po.soldeRestant;

    let solde = soldeActuel;
    const semaines = buckets.map((b, i) => {
      const net = b.encaissements - b.decaissements;
      solde += net;
      return {
        semaine: i === 0 ? 'en_retard' : i === nbSemaines ? `semaine_${i}_et_apres` : `semaine_${i}`,
        encaissementsPrevus: b.encaissements,
        decaissementsPrevus: b.decaissements,
        fluxNet: net,
        soldeProjete: solde,
      };
    });

    res.status(200).json({
      soldeActuelFourni: Number(req.query.soldeActuel) ? soldeActuel : null,
      totalCreances: creances.reduce((s, i) => s + i.soldeRestant, 0),
      totalDettesFournisseurs: dettes.reduce((s, o) => s + o.soldeRestant, 0),
      semaines,
    });
  } catch (error) {
    console.error('Erreur getTresorerie :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/profitability/score — rentabilité avancée (2026-09-26). Voir
// profitabilityCalculationService.computeProfitabilityScore pour la formule et ses poids —
// proposés par défaut, jamais présentés comme validés par la direction, toujours renvoyés avec le
// détail par critère (transparence assumée plutôt qu'une boîte noire).
export const getProfitabilityScore = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const now = new Date();
    const debutMoisCourant = new Date(now.getFullYear(), now.getMonth(), 1);
    const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [caMoisCourant, caMoisPrecedent, simulationsActives, unpaidInvoices, stockItems, unpaidOrders] = await Promise.all([
      Invoice.findAll({ where: { companyId, type: 'facture', statut: 'envoyee', dateEmission: { [Op.gte]: debutMoisCourant } } }),
      Invoice.findAll({ where: { companyId, type: 'facture', statut: 'envoyee', dateEmission: { [Op.between]: [debutMoisPrecedent, debutMoisCourant] } } }),
      ProfitabilitySimulation.findAll({ where: { companyId, statut: 'active' } }),
      Invoice.findAll({ where: { companyId, type: 'facture', statut: 'envoyee', paymentStatus: { [Op.ne]: 'payee' } } }),
      StockItem.findAll({ where: { companyId } }),
      PurchaseOrder.findAll({ where: { companyId, statut: { [Op.in]: ['envoyee', 'confirmee', 'recue'] }, soldeRestant: { [Op.gt]: 0 } } }),
    ]);

    const sum = (invs: Invoice[]) => invs.reduce((s, i) => s + i.totalTTC, 0);
    const caCourant = sum(caMoisCourant);
    const caPrecedent = sum(caMoisPrecedent);
    const croissanceCaPct = caPrecedent > 0 ? ((caCourant - caPrecedent) / caPrecedent) * 100 : (caCourant > 0 ? 100 : 0);

    const creances = unpaidInvoices.reduce((s, i) => s + i.soldeRestant, 0);
    const ratioCreancesSurCAPct = caCourant > 0 ? (creances / caCourant) * 100 : 0;

    const pctSimulationsRentables = simulationsActives.length > 0
      ? (simulationsActives.filter((s) => s.statutRentabilite === 'vert').length / simulationsActives.length) * 100
      : 100; // aucune simulation active : ne pénalise pas le score par défaut

    const pctStockSain = stockItems.length > 0
      ? (stockItems.filter((i) => i.quantite > 0 && (i.seuilAlerte === null || i.quantite > i.seuilAlerte)).length / stockItems.length) * 100
      : 100;

    const enRetard = unpaidOrders.filter((o) => o.dateEcheance && new Date(o.dateEcheance) < now).length;
    const pctEcheancesFournisseursRespectees = unpaidOrders.length > 0
      ? ((unpaidOrders.length - enRetard) / unpaidOrders.length) * 100
      : 100;

    const resultat = computeProfitabilityScore({
      croissanceCaPct, ratioCreancesSurCAPct, pctSimulationsRentables, pctStockSain, pctEcheancesFournisseursRespectees,
    });

    res.status(200).json(resultat);
  } catch (error) {
    console.error('Erreur getProfitabilityScore :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
