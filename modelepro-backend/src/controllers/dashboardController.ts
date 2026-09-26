import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Customer } from '../models/Customer';
import { Opportunity } from '../models/Opportunity';
import { SalesOrder } from '../models/SalesOrder';
import { SalesOrderLine } from '../models/SalesOrderLine';
import { Invoice } from '../models/Invoice';
import { InvoicePayment } from '../models/InvoicePayment';
import { Product } from '../models/Product';
import { StockItem } from '../models/StockItem';
import { StockMovement } from '../models/StockMovement';
import { Supplier } from '../models/Supplier';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { CrmTask } from '../models/CrmTask';
import { User } from '../models/User';
import { Site } from '../models/Site';
import { hasFeature, PLAN_FEATURE_KEYS } from '../services/subscriptionService';

// Tableau de bord de pilotage (ROADMAP_BACKEND.md §8, cahier des charges §11). Les indicateurs
// "période" respectent le filtre from/to (critère principal : "filtrables par période et
// cohérents avec les transactions réelles") ; les indicateurs d'état courant (pipeline, stock,
// commandes en cours...) sont volontairement indépendants de la période, car ce sont des photos
// instantanées, pas des flux sur un intervalle. Toutes les requêtes sont calculées en JS après
// filtrage par companyId (même approche que getForecast/getSupplierStatement/getCustomerStatement
// déjà en place) — volumes attendus modestes pour une TPE/PME, priorité à la lisibilité/exactitude
// plutôt qu'à des GROUP BY SQL complexes à porter entre SQLite (tests) et PostgreSQL (prod).

const parsePeriod = (query: any): { from: Date; to: Date } => {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = query.from ? new Date(String(query.from)) : defaultFrom;
  const to = query.to ? new Date(String(query.to)) : now;
  return { from, to };
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfYear = (d: Date) => new Date(d.getFullYear(), 0, 1);

const userLabel = (user: User | null | undefined): string => (user ? `${user.prenom} ${user.nom}` : 'Non assigné');

// --- Commercial ---
// `includePipeline` : la valorisation du pipeline d'opportunités n'a de sens que si l'entreprise a
// accès au module CRM & pipeline commercial (cahier NAATALIX_Formules_Fonctionnalites.docx,
// 2026-09-24 — Essentiel n'a pas ce module, donc pas de section pipeline dans son dashboard).
const buildCommercialIndicators = async (companyId: number, from: Date, to: Date, now: Date, includePipeline: boolean) => {
  const [invoicesJour, invoicesMois, invoicesAnnee] = await Promise.all([
    Invoice.findAll({ where: { companyId, statut: 'envoyee', dateEmission: { [Op.gte]: startOfDay(now) } } }),
    Invoice.findAll({ where: { companyId, statut: 'envoyee', dateEmission: { [Op.gte]: startOfMonth(now) } } }),
    Invoice.findAll({ where: { companyId, statut: 'envoyee', dateEmission: { [Op.gte]: startOfYear(now) } } }),
  ]);
  const caFromInvoices = (invoices: Invoice[]) =>
    invoices.reduce((sum, i) => sum + (i.type === 'avoir' ? -i.totalTTC : i.totalTTC), 0);

  const ordersInPeriod = await SalesOrder.findAll({
    where: { companyId, statut: { [Op.in]: ['confirmee', 'en_preparation', 'livree'] }, createdAt: { [Op.between]: [from, to] } },
  });
  const nombreVentes = ordersInPeriod.length;
  const caVentesPeriode = ordersInPeriod.reduce((sum, o) => sum + o.totalTTC, 0);
  const panierMoyen = nombreVentes > 0 ? caVentesPeriode / nombreVentes : 0;

  const nouveauxClients = await Customer.count({ where: { companyId, createdAt: { [Op.between]: [from, to] } } });
  const clientsCreesPeriode = await Customer.count({ where: { companyId, createdAt: { [Op.between]: [from, to] } } });
  const clientsConvertisPeriode = await Customer.count({ where: { companyId, convertedAt: { [Op.between]: [from, to] } } });
  const tauxConversionPct = clientsCreesPeriode > 0 ? (clientsConvertisPeriode / clientsCreesPeriode) * 100 : 0;

  const base = {
    caJour: caFromInvoices(invoicesJour),
    caMois: caFromInvoices(invoicesMois),
    caAnnee: caFromInvoices(invoicesAnnee),
    nombreVentes,
    panierMoyen,
    nouveauxClients,
    tauxConversionPct,
  };
  if (!includePipeline) return base;

  const openOpportunities = await Opportunity.findAll({ where: { companyId, statut: 'ouverte' } });
  const pipelineValeurTotale = openOpportunities.reduce((sum, o) => sum + o.valeur, 0);
  const pipelineValeurPonderee = openOpportunities.reduce((sum, o) => sum + o.valeur * (o.probabilite / 100), 0);

  return {
    ...base,
    pipeline: {
      nombreOpportunitesOuvertes: openOpportunities.length,
      valeurTotale: pipelineValeurTotale,
      valeurPonderee: pipelineValeurPonderee,
    },
  };
};

// --- Finance opérationnelle ---
const buildFinanceIndicators = async (companyId: number, from: Date, to: Date) => {
  const invoicesPeriode = await Invoice.findAll({ where: { companyId, statut: 'envoyee', dateEmission: { [Op.between]: [from, to] } } });
  const montantFacture = invoicesPeriode
    .filter((i) => i.type === 'facture')
    .reduce((sum, i) => sum + i.totalTTC, 0);

  const invoiceIds = (await Invoice.findAll({ where: { companyId }, attributes: ['id'] })).map((i) => i.id);
  const paymentsPeriode = invoiceIds.length
    ? await InvoicePayment.findAll({ where: { invoiceId: { [Op.in]: invoiceIds }, datePaiement: { [Op.between]: [from, to] } } })
    : [];
  const montantEncaisse = paymentsPeriode.reduce((sum, p) => sum + p.montant, 0);

  const unpaidInvoices = await Invoice.findAll({
    where: { companyId, statut: 'envoyee', type: 'facture', paymentStatus: { [Op.ne]: 'payee' } },
  });
  const creances = unpaidInvoices.reduce((sum, i) => sum + i.soldeRestant, 0);
  const paiementsPartielsCount = unpaidInvoices.filter((i) => i.paymentStatus === 'partiellement_payee').length;

  const now = new Date();
  const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const echeances = unpaidInvoices.filter((i) => i.dateEcheance && new Date(i.dateEcheance) <= dans30Jours);

  return {
    montantFacture,
    montantEncaisse,
    creances,
    impayesCount: unpaidInvoices.length,
    paiementsPartielsCount,
    echeancesAVenir: {
      count: echeances.length,
      montant: echeances.reduce((sum, i) => sum + i.soldeRestant, 0),
    },
  };
};

// --- Produits/Services ---
const buildProductIndicators = async (companyId: number, from: Date, to: Date) => {
  const orders = await SalesOrder.findAll({
    where: { companyId, statut: { [Op.in]: ['confirmee', 'en_preparation', 'livree'] }, createdAt: { [Op.between]: [from, to] } },
    attributes: ['id'],
  });
  const orderIds = orders.map((o) => o.id);
  const lines = orderIds.length
    ? await SalesOrderLine.findAll({ where: { salesOrderId: { [Op.in]: orderIds }, productId: { [Op.ne]: null } } })
    : [];

  const products = await Product.findAll({ where: { companyId } });
  const productById = new Map(products.map((p) => [p.id, p]));

  const parProduit = new Map<number, { quantite: number; ca: number }>();
  for (const line of lines) {
    if (!line.productId) continue;
    const brut = line.quantite * line.prixUnitaire * (1 - line.remisePct / 100);
    const entry = parProduit.get(line.productId) || { quantite: 0, ca: 0 };
    entry.quantite += line.quantite;
    entry.ca += brut;
    parProduit.set(line.productId, entry);
  }

  const topVentes = Array.from(parProduit.entries())
    .map(([productId, v]) => ({ productId, nom: productById.get(productId)?.nom || '—', quantiteVendue: v.quantite, ca: v.ca }))
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 5);

  const parCategorie = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId) continue;
    const categorie = productById.get(line.productId)?.categorie || 'Sans catégorie';
    const brut = line.quantite * line.prixUnitaire * (1 - line.remisePct / 100);
    parCategorie.set(categorie, (parCategorie.get(categorie) || 0) + brut);
  }
  const chiffreParCategorie = Array.from(parCategorie.entries())
    .map(([categorie, ca]) => ({ categorie, ca }))
    .sort((a, b) => b.ca - a.ca);

  const vendusIds = new Set(parProduit.keys());
  const produitsPeuActifs = products
    .filter((p) => p.statut === 'actif' && !vendusIds.has(p.id))
    .slice(0, 10)
    .map((p) => ({ productId: p.id, nom: p.nom }));

  return { topVentes, chiffreParCategorie, produitsPeuActifs };
};

// --- Stocks ---
const buildStockIndicators = async (companyId: number, from: Date, to: Date) => {
  const items = await StockItem.findAll({ where: { companyId } });
  const quantiteTotale = items.reduce((sum, i) => sum + i.quantite, 0);
  const valeurTotale = items.reduce((sum, i) => sum + i.quantite * i.coutMoyenPondere, 0);
  const alertesCount = items.filter((i) => i.seuilAlerte !== null && i.quantite <= i.seuilAlerte).length;
  const rupturesCount = items.filter((i) => i.quantite <= 0).length;
  const mouvementsPeriode = await StockMovement.count({ where: { companyId, createdAt: { [Op.between]: [from, to] } } });

  return { quantiteTotale, valeurTotale, alertesCount, rupturesCount, mouvementsPeriode };
};

// --- Fournisseurs ---
const buildSupplierIndicators = async (companyId: number, from: Date, to: Date) => {
  const ordersPeriode = await PurchaseOrder.findAll({
    where: { companyId, statut: { [Op.in]: ['envoyee', 'confirmee', 'recue'] }, dateCommande: { [Op.between]: [from, to] } },
    include: [{ model: Supplier, as: 'supplier', attributes: ['id', 'nom'] }],
  });
  const achatsPeriode = ordersPeriode.reduce((sum, o) => sum + o.totalTTC, 0);

  const commandesEnCoursCount = await PurchaseOrder.count({ where: { companyId, statut: { [Op.in]: ['envoyee', 'confirmee'] } } });

  const unpaidOrders = await PurchaseOrder.findAll({
    where: { companyId, statut: { [Op.in]: ['envoyee', 'confirmee', 'recue'] }, soldeRestant: { [Op.gt]: 0 } },
  });
  const now = new Date();
  const dans30Jours = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const echeances = unpaidOrders.filter((o) => o.dateEcheance && new Date(o.dateEcheance) <= dans30Jours);

  const parFournisseur = new Map<number, { nom: string; montant: number }>();
  for (const order of ordersPeriode) {
    const supplier = order.get('supplier') as Supplier | undefined;
    if (!supplier) continue;
    const entry = parFournisseur.get(supplier.id) || { nom: supplier.nom, montant: 0 };
    entry.montant += order.totalTTC;
    parFournisseur.set(supplier.id, entry);
  }
  const principauxFournisseurs = Array.from(parFournisseur.entries())
    .map(([supplierId, v]) => ({ supplierId, nom: v.nom, montant: v.montant }))
    .sort((a, b) => b.montant - a.montant)
    .slice(0, 5);

  return {
    achatsPeriode,
    commandesEnCoursCount,
    echeancesAVenir: { count: echeances.length, montant: echeances.reduce((sum, o) => sum + o.soldeRestant, 0) },
    principauxFournisseurs,
  };
};

// --- Équipe commerciale ---
const buildTeamIndicators = async (companyId: number, from: Date, to: Date) => {
  const openOpportunities = await Opportunity.findAll({ where: { companyId, statut: 'ouverte' } });
  const invoicesPeriode = await Invoice.findAll({
    where: { companyId, statut: 'envoyee', type: 'facture', dateEmission: { [Op.between]: [from, to] } },
  });
  const openTasks = await CrmTask.findAll({ where: { companyId, statut: 'a_faire' } });

  const userIds = new Set<number>();
  [...openOpportunities.map((o) => o.assignedToUserId), ...invoicesPeriode.map((i) => i.createdByUserId), ...openTasks.map((t) => t.assignedToUserId)]
    .forEach((id) => { if (id) userIds.add(id); });
  const users = userIds.size ? await User.findAll({ where: { id: { [Op.in]: Array.from(userIds) } } }) : [];
  const userById = new Map(users.map((u) => [u.id, u]));

  const opportunitesParCommercial = new Map<number, { count: number; valeur: number }>();
  for (const opp of openOpportunities) {
    if (!opp.assignedToUserId) continue;
    const entry = opportunitesParCommercial.get(opp.assignedToUserId) || { count: 0, valeur: 0 };
    entry.count += 1;
    entry.valeur += opp.valeur;
    opportunitesParCommercial.set(opp.assignedToUserId, entry);
  }

  const ventesParCommercial = new Map<number, number>();
  for (const inv of invoicesPeriode) {
    if (!inv.createdByUserId) continue;
    ventesParCommercial.set(inv.createdByUserId, (ventesParCommercial.get(inv.createdByUserId) || 0) + inv.totalTTC);
  }

  const tachesParCommercial = new Map<number, number>();
  for (const task of openTasks) {
    if (!task.assignedToUserId) continue;
    tachesParCommercial.set(task.assignedToUserId, (tachesParCommercial.get(task.assignedToUserId) || 0) + 1);
  }

  return {
    opportunitesParCommercial: Array.from(opportunitesParCommercial.entries())
      .map(([userId, v]) => ({ userId, nom: userLabel(userById.get(userId)), nombre: v.count, valeur: v.valeur })),
    ventesParCommercial: Array.from(ventesParCommercial.entries())
      .map(([userId, montant]) => ({ userId, nom: userLabel(userById.get(userId)), montant })),
    tachesEnCoursParCommercial: Array.from(tachesParCommercial.entries())
      .map(([userId, count]) => ({ userId, nom: userLabel(userById.get(userId)), count })),
  };
};

// --- Reporting multisite (Business uniquement, cahier §13 "Consolidation multisite"/"Reporting
// par site") — ventile chiffre d'affaires, ventes, achats et valeur de stock par site. Un document
// sans site rattaché (créé avant l'ajout de siteId, ou entreprise sans site actif) apparaît sous
// "Sans site" plutôt que d'être silencieusement exclu.
const SANS_SITE = 'Sans site';
const buildSiteIndicators = async (companyId: number, from: Date, to: Date) => {
  const sites = await Site.findAll({ where: { companyId } });
  const siteById = new Map(sites.map((s) => [s.id, s.nom]));
  const siteLabel = (id: number | null) => (id !== null && siteById.has(id) ? siteById.get(id)! : SANS_SITE);

  const [invoicesPeriode, ordersPeriode, achatsPeriode, stockItems] = await Promise.all([
    Invoice.findAll({ where: { companyId, statut: 'envoyee', dateEmission: { [Op.between]: [from, to] } } }),
    SalesOrder.findAll({ where: { companyId, statut: { [Op.in]: ['confirmee', 'en_preparation', 'livree'] }, createdAt: { [Op.between]: [from, to] } } }),
    PurchaseOrder.findAll({ where: { companyId, statut: { [Op.in]: ['envoyee', 'confirmee', 'recue'] }, dateCommande: { [Op.between]: [from, to] } } }),
    StockItem.findAll({ where: { companyId } }),
  ]);

  const parSite = new Map<string, { ca: number; nombreVentes: number; achats: number; valeurStock: number }>();
  const entry = (label: string) => {
    if (!parSite.has(label)) parSite.set(label, { ca: 0, nombreVentes: 0, achats: 0, valeurStock: 0 });
    return parSite.get(label)!;
  };
  for (const s of sites) entry(s.nom);

  for (const inv of invoicesPeriode) {
    entry(siteLabel(inv.siteId)).ca += inv.type === 'avoir' ? -inv.totalTTC : inv.totalTTC;
  }
  for (const o of ordersPeriode) {
    entry(siteLabel(o.siteId)).nombreVentes += 1;
  }
  for (const o of achatsPeriode) {
    entry(siteLabel(o.siteId)).achats += o.totalTTC;
  }
  for (const item of stockItems) {
    entry(siteLabel(item.siteId)).valeurStock += item.quantite * item.coutMoyenPondere;
  }

  return Array.from(parSite.entries())
    .map(([site, v]) => ({ site, ...v }))
    .sort((a, b) => b.ca - a.ca);
};

// GET /api/v1/crm/dashboard?from=&to=
// Le tableau de bord "CA/ventes" (commercial de base + finance) est accessible à toutes les
// formules. Les sections "avancées" (produits, stocks, fournisseurs, pipeline commercial) et le
// reporting par utilisateur (équipe commerciale) sont filtrées selon le plan de l'entreprise —
// cahier NAATALIX_Formules_Fonctionnalites.docx, 2026-09-24. Sans abonnement (comptes antérieurs
// à la Phase 4), hasFeature() renvoie true pour tout : accès complet, comme ailleurs.
export const getDashboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const { from, to } = parsePeriod(req.query);
    const now = new Date();

    const [avance, pipeline, reportingUtilisateur, reportingSite] = await Promise.all([
      hasFeature(companyId, PLAN_FEATURE_KEYS.DASHBOARD_AVANCE),
      hasFeature(companyId, PLAN_FEATURE_KEYS.CRM_PIPELINE),
      hasFeature(companyId, PLAN_FEATURE_KEYS.REPORTING_UTILISATEUR),
      hasFeature(companyId, PLAN_FEATURE_KEYS.REPORTING_SITE),
    ]);

    const [commercial, finance, produits, stocks, fournisseurs, equipeCommerciale, parSite] = await Promise.all([
      buildCommercialIndicators(companyId, from, to, now, pipeline),
      buildFinanceIndicators(companyId, from, to),
      avance ? buildProductIndicators(companyId, from, to) : Promise.resolve(null),
      avance ? buildStockIndicators(companyId, from, to) : Promise.resolve(null),
      avance ? buildSupplierIndicators(companyId, from, to) : Promise.resolve(null),
      reportingUtilisateur ? buildTeamIndicators(companyId, from, to) : Promise.resolve(null),
      reportingSite ? buildSiteIndicators(companyId, from, to) : Promise.resolve(null),
    ]);

    res.status(200).json({
      periode: { from: from.toISOString(), to: to.toISOString() },
      commercial,
      finance,
      produits,
      stocks,
      fournisseurs,
      equipeCommerciale,
      parSite,
    });
  } catch (error) {
    console.error('Erreur getDashboard :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors du calcul du tableau de bord.' });
  }
};
