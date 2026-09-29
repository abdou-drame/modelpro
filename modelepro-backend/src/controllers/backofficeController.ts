import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { User } from '../models/User';
import { Company } from '../models/Company';
import { Customer } from '../models/Customer';
import { Product } from '../models/Product';
import { Quote } from '../models/Quote';
import { SalesOrder } from '../models/SalesOrder';
import { Invoice } from '../models/Invoice';
import { Supplier } from '../models/Supplier';
import { AuditLog } from '../models/AuditLog';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { CompanySubscription } from '../models/CompanySubscription';
import { SubscriptionEvent } from '../models/SubscriptionEvent';
import { hashPassword } from '../utils/auth';
import { recordAudit } from '../services/auditService';
import { effectiveStatus, recordSubscriptionEvent, renewSubscription } from '../services/subscriptionService';

const PLATFORM_ROLES = ['superadmin', 'support', 'readonly'] as const;
const JOUR_MS = 24 * 60 * 60 * 1000;

const audit = (req: AuthenticatedRequest, action: string, extra: { companyId?: number; objectType?: string; objectId?: number; details?: Record<string, unknown> } = {}) =>
  recordAudit({ actorUserId: req.user!.id, actorType: 'staff', req, action, ...extra });

// --- Personnel ATAABA ---

// POST /api/v1/backoffice/staff — superadmin
export const createStaff = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nom, prenom, telephone, email, password, platformRole } = req.body;
    if (!nom || !prenom || !telephone || !password || !PLATFORM_ROLES.includes(platformRole)) {
      res.status(400).json({ error: `nom, prenom, telephone, password et platformRole (${PLATFORM_ROLES.join('|')}) requis.` });
      return;
    }
    if (await User.findOne({ where: { telephone } })) {
      res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
      return;
    }

    const staff = await User.create({
      nom, prenom, telephone, email: email || null,
      password: await hashPassword(password),
      role: 'ataaba_staff', statut: 'actif', platformRole,
    });
    await audit(req, 'staff.create', { objectType: 'User', objectId: staff.id, details: { platformRole } });

    res.status(201).json({ id: staff.id, nom: staff.nom, prenom: staff.prenom, telephone: staff.telephone, platformRole: staff.platformRole, statut: staff.statut });
  } catch (error) {
    console.error('Erreur createStaff :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/backoffice/staff — superadmin
export const listStaff = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const staff = await User.findAll({
      where: { role: 'ataaba_staff' },
      attributes: ['id', 'nom', 'prenom', 'telephone', 'email', 'platformRole', 'statut', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });
    res.status(200).json(staff);
  } catch (error) {
    console.error('Erreur listStaff :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/backoffice/staff/:id/status — superadmin (jamais sur soi-même)
export const setStaffStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { statut } = req.body;
    if (statut !== 'actif' && statut !== 'suspendu') { res.status(400).json({ error: 'statut invalide (actif|suspendu).' }); return; }

    const staff = await User.findOne({ where: { id: Number(req.params.id), role: 'ataaba_staff' } });
    if (!staff) { res.status(404).json({ error: 'Membre du personnel introuvable.' }); return; }
    if (staff.id === req.user!.id) { res.status(400).json({ error: 'Vous ne pouvez pas modifier votre propre statut.' }); return; }

    staff.statut = statut;
    await staff.save();
    await audit(req, 'staff.status', { objectType: 'User', objectId: staff.id, details: { statut } });
    res.status(200).json({ id: staff.id, statut: staff.statut });
  } catch (error) {
    console.error('Erreur setStaffStatus :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Entreprises ---

const subscriptionView = (sub: CompanySubscription | null) => {
  if (!sub) return null;
  const plan = sub.get('plan') as SubscriptionPlan | undefined;
  return {
    statut: sub.statut,
    statutEffectif: effectiveStatus(sub),
    plan: plan ? { id: plan.id, code: plan.code, nom: plan.nom } : null,
    cycle: sub.cycle,
    dateFinEssai: sub.dateFinEssai,
    dateFinPeriode: sub.dateFinPeriode,
    motifSuspension: sub.motifSuspension,
  };
};

// GET /api/v1/backoffice/companies?search=&statutAbonnement=&page=&limit=
export const listCompanies = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, statutAbonnement, page = 1, limit = 20 } = req.query;
    const where: any = {};
    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      where.nom = { [likeOp]: `%${String(search).trim()}%` };
    }

    const subscriptionInclude: any = { model: CompanySubscription, as: 'subscription', required: false, include: [{ model: SubscriptionPlan, as: 'plan' }] };
    if (statutAbonnement) { subscriptionInclude.where = { statut: String(statutAbonnement) }; subscriptionInclude.required = true; }

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await Company.findAndCountAll({
      where, include: [subscriptionInclude], limit: Number(limit), offset, order: [['createdAt', 'DESC']], distinct: true,
    });

    const data = rows.map((c) => ({
      id: c.id, nom: c.nom, email: c.email, telephone: c.telephone, statut: c.statut, createdAt: c.createdAt,
      abonnement: subscriptionView(c.get('subscription') as CompanySubscription | null),
    }));
    res.status(200).json({ data, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listCompanies :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

const loadCompany = async (req: AuthenticatedRequest, res: Response): Promise<Company | null> => {
  const company = await Company.findByPk(Number(req.params.id));
  if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return null; }
  return company;
};

// GET /api/v1/backoffice/companies/:id — identité + abonnement + métriques d'usage (compteurs
// uniquement : le back-office ne lit jamais le contenu des données métier des clients, cahier
// des charges §14 "sans exposer inutilement les données métiers").
export const getCompanyDetail = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    const id = company.id;

    const [membres, clients, produits, devis, commandes, factures, fournisseurs, sub] = await Promise.all([
      User.count({ where: { companyId: id } }),
      Customer.count({ where: { companyId: id } }),
      Product.count({ where: { companyId: id } }),
      Quote.count({ where: { companyId: id } }),
      SalesOrder.count({ where: { companyId: id } }),
      Invoice.count({ where: { companyId: id } }),
      Supplier.count({ where: { companyId: id } }),
      CompanySubscription.findOne({ where: { companyId: id }, include: [{ model: SubscriptionPlan, as: 'plan' }] }),
    ]);

    await audit(req, 'company.view', { companyId: id, objectType: 'Company', objectId: id });

    res.status(200).json({
      company: { id: company.id, nom: company.nom, ninea: company.ninea, rccm: company.rccm, adresse: company.adresse, telephone: company.telephone, email: company.email, statut: company.statut, createdAt: company.createdAt },
      abonnement: subscriptionView(sub),
      usage: { membres, clients, produits, devis, commandes, factures, fournisseurs },
    });
  } catch (error) {
    console.error('Erreur getCompanyDetail :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/backoffice/companies/:id/members — support/superadmin
export const listCompanyMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    const members = await User.findAll({
      where: { companyId: company.id },
      attributes: ['id', 'nom', 'prenom', 'telephone', 'email', 'companyRole', 'statut', 'createdAt'],
    });
    await audit(req, 'company.members.view', { companyId: company.id, objectType: 'Company', objectId: company.id });
    res.status(200).json(members);
  } catch (error) {
    console.error('Erreur listCompanyMembers :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Plans ---

export const listPlans = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    res.status(200).json(await SubscriptionPlan.findAll({ order: [['prixMensuel', 'ASC']] }));
  } catch (error) {
    console.error('Erreur listPlans :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

export const createPlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { code, nom, prixMensuel, prixAnnuel, maxUtilisateurs, maxSites, essaiJours, features } = req.body;
    if (!code || !nom) { res.status(400).json({ error: 'code et nom requis.' }); return; }
    if (await SubscriptionPlan.findOne({ where: { code } })) { res.status(400).json({ error: 'Ce code de plan existe déjà.' }); return; }
    if (features !== undefined && !Array.isArray(features)) { res.status(400).json({ error: 'features doit être un tableau de chaînes.' }); return; }

    const plan = await SubscriptionPlan.create({
      code, nom, prixMensuel: Number(prixMensuel) || 0, prixAnnuel: Number(prixAnnuel) || 0,
      maxUtilisateurs: maxUtilisateurs ?? null, maxSites: maxSites ?? null, essaiJours: essaiJours !== undefined ? Number(essaiJours) : 14,
      features: JSON.stringify(features || []),
    });
    await audit(req, 'plan.create', { objectType: 'SubscriptionPlan', objectId: plan.id });
    res.status(201).json(plan);
  } catch (error) {
    console.error('Erreur createPlan :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

export const updatePlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const plan = await SubscriptionPlan.findByPk(Number(req.params.id));
    if (!plan) { res.status(404).json({ error: 'Plan introuvable.' }); return; }

    if (req.body.features !== undefined && !Array.isArray(req.body.features)) {
      res.status(400).json({ error: 'features doit être un tableau de chaînes.' });
      return;
    }
    for (const field of ['nom', 'prixMensuel', 'prixAnnuel', 'maxUtilisateurs', 'maxSites', 'essaiJours', 'actif'] as const) {
      if (req.body[field] !== undefined) (plan as any)[field] = req.body[field];
    }
    if (req.body.features !== undefined) plan.features = JSON.stringify(req.body.features);
    await plan.save();
    await audit(req, 'plan.update', { objectType: 'SubscriptionPlan', objectId: plan.id, details: req.body });
    res.status(200).json(plan);
  } catch (error) {
    console.error('Erreur updatePlan :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Abonnements ---

const loadSubscription = async (companyId: number, res: Response): Promise<CompanySubscription | null> => {
  const sub = await CompanySubscription.findOne({ where: { companyId } });
  if (!sub) { res.status(404).json({ error: 'Cette entreprise n\'a pas d\'abonnement.' }); return null; }
  return sub;
};

// PATCH /api/v1/backoffice/companies/:id/suspend — superadmin
export const suspendCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    const sub = await loadSubscription(company.id, res);
    if (!sub) return;

    const motif = req.body.motif ? String(req.body.motif) : null;
    await sequelize.transaction(async (t) => {
      sub.statut = 'suspendu';
      sub.motifSuspension = motif;
      await sub.save({ transaction: t });
      company.statut = 'suspendu';
      await company.save({ transaction: t });
      await recordSubscriptionEvent({ companyId: company.id, type: 'suspension', toPlanId: sub.planId, statut: 'suspendu', actorUserId: req.user!.id, note: motif }, t);
    });
    await audit(req, 'company.suspend', { companyId: company.id, objectType: 'Company', objectId: company.id, details: { motif } });
    res.status(200).json({ id: company.id, statut: 'suspendu' });
  } catch (error) {
    console.error('Erreur suspendCompany :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/backoffice/companies/:id/reactivate — superadmin. Réactive sans prolonger la
// période payée : si elle est échue, l'entreprise repasse aussitôt en 'expire' (renouveler d'abord).
export const reactivateCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    const sub = await loadSubscription(company.id, res);
    if (!sub) return;

    await sequelize.transaction(async (t) => {
      sub.statut = sub.dateFinPeriode ? 'actif' : 'essai';
      sub.motifSuspension = null;
      await sub.save({ transaction: t });
      company.statut = 'actif';
      await company.save({ transaction: t });
      await recordSubscriptionEvent({ companyId: company.id, type: 'reactivation', toPlanId: sub.planId, statut: sub.statut, actorUserId: req.user!.id }, t);
    });
    await audit(req, 'company.reactivate', { companyId: company.id, objectType: 'Company', objectId: company.id });
    res.status(200).json({ id: company.id, statutAbonnement: sub.statut, statutEffectif: effectiveStatus(sub) });
  } catch (error) {
    console.error('Erreur reactivateCompany :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/backoffice/companies/:id/subscription/plan — superadmin
export const changePlan = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    const sub = await loadSubscription(company.id, res);
    if (!sub) return;

    const { planId, cycle } = req.body;
    const plan = await SubscriptionPlan.findOne({ where: { id: Number(planId), actif: true } });
    if (!plan) { res.status(404).json({ error: 'Plan introuvable ou inactif.' }); return; }
    if (cycle && cycle !== 'mensuel' && cycle !== 'annuel') { res.status(400).json({ error: 'cycle invalide (mensuel|annuel).' }); return; }

    // Un plan plus petit ne doit pas laisser l'entreprise au-dessus de ses nouveaux quotas.
    const users = await User.count({ where: { companyId: company.id, statut: 'actif' } });
    if (plan.maxUtilisateurs !== null && users > plan.maxUtilisateurs) {
      res.status(400).json({ error: `Impossible : l'entreprise a ${users} utilisateurs actifs pour un plan limité à ${plan.maxUtilisateurs}.` });
      return;
    }

    const previous = sub.planId;
    sub.planId = plan.id;
    if (cycle) sub.cycle = cycle;
    await sub.save();
    await recordSubscriptionEvent({ companyId: company.id, type: 'changement_plan', fromPlanId: previous, toPlanId: plan.id, statut: sub.statut, actorUserId: req.user!.id });
    await audit(req, 'subscription.plan_change', { companyId: company.id, objectType: 'Company', objectId: company.id, details: { from: previous, to: plan.id } });
    res.status(200).json({ planId: sub.planId, cycle: sub.cycle });
  } catch (error) {
    console.error('Erreur changePlan :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/backoffice/companies/:id/subscription/renew — superadmin (paiement constaté hors
// ligne ou en attendant l'intégration PayTrack)
export const renewCompanySubscription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    if (!(await loadSubscription(company.id, res))) return;

    const { cycle, note } = req.body;
    if (cycle && cycle !== 'mensuel' && cycle !== 'annuel') { res.status(400).json({ error: 'cycle invalide (mensuel|annuel).' }); return; }

    const sub = await sequelize.transaction((t) => renewSubscription(company.id, { cycle, note, actorUserId: req.user!.id }, t));
    await audit(req, 'subscription.renew', { companyId: company.id, objectType: 'Company', objectId: company.id, details: { cycle: sub.cycle } });
    res.status(200).json({ statut: sub.statut, cycle: sub.cycle, dateFinPeriode: sub.dateFinPeriode });
  } catch (error) {
    console.error('Erreur renewCompanySubscription :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/backoffice/companies/:id/trial/extend — superadmin
export const extendTrial = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    const sub = await loadSubscription(company.id, res);
    if (!sub) return;

    const jours = Number(req.body.jours);
    if (!jours || jours <= 0 || jours > 90) { res.status(400).json({ error: 'jours requis (1 à 90).' }); return; }

    const now = new Date();
    const base = sub.dateFinEssai && new Date(sub.dateFinEssai) > now ? new Date(sub.dateFinEssai) : now;
    sub.dateFinEssai = new Date(base.getTime() + jours * JOUR_MS);
    sub.statut = 'essai';
    sub.alerteExpirationEnvoyee = false;
    await sub.save();
    await recordSubscriptionEvent({ companyId: company.id, type: 'prolongation_essai', toPlanId: sub.planId, statut: 'essai', actorUserId: req.user!.id, note: `+${jours} jours` });
    await audit(req, 'trial.extend', { companyId: company.id, objectType: 'Company', objectId: company.id, details: { jours } });
    res.status(200).json({ dateFinEssai: sub.dateFinEssai });
  } catch (error) {
    console.error('Erreur extendTrial :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/backoffice/companies/:id/subscription/history
export const subscriptionHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await loadCompany(req, res);
    if (!company) return;
    const events = await SubscriptionEvent.findAll({ where: { companyId: company.id }, order: [['createdAt', 'ASC'], ['id', 'ASC']] });
    res.status(200).json(events);
  } catch (error) {
    console.error('Erreur subscriptionHistory :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// --- Supervision globale ---

// GET /api/v1/backoffice/stats — statistiques globales, sans données métier des entreprises
export const getPlatformStats = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const subs = await CompanySubscription.findAll({ include: [{ model: SubscriptionPlan, as: 'plan' }] });
    const parStatut: Record<string, number> = { essai: 0, actif: 0, suspendu: 0, expire: 0, annule: 0 };
    let mrr = 0;
    for (const sub of subs) {
      const eff = effectiveStatus(sub);
      parStatut[eff] += 1;
      const plan = sub.get('plan') as SubscriptionPlan | undefined;
      if (eff === 'actif' && plan) mrr += sub.cycle === 'annuel' ? plan.prixAnnuel / 12 : plan.prixMensuel;
    }

    res.status(200).json({
      entreprises: await Company.count(),
      utilisateursEntreprises: await User.count({ where: { role: 'entreprise' } }),
      abonnementsParStatut: parStatut,
      revenuMensuelRecurrent: Math.round(mrr),
    });
  } catch (error) {
    console.error('Erreur getPlatformStats :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/backoffice/audit-logs?companyId=&action=&actorUserId=&page=&limit= — superadmin
export const listAuditLogs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyId, action, actorUserId, page = 1, limit = 50 } = req.query;
    const where: any = {};
    if (companyId) where.companyId = Number(companyId);
    if (actorUserId) where.actorUserId = Number(actorUserId);
    if (action) where.action = { [Op.like]: `${String(action)}%` };

    const offset = (Number(page) - 1) * Number(limit);
    const { count, rows } = await AuditLog.findAndCountAll({ where, limit: Number(limit), offset, order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    res.status(200).json({ data: rows, total: count, page: Number(page), totalPages: Math.ceil(count / Number(limit)) });
  } catch (error) {
    console.error('Erreur listAuditLogs :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

