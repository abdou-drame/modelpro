import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

interface AuditParams {
  actorUserId?: number | null;
  actorType: 'staff' | 'company_user' | 'system' | 'webhook';
  companyId?: number | null;
  action: string;
  objectType?: string;
  objectId?: number | null;
  resultat?: 'succes' | 'echec';
  details?: Record<string, unknown>;
  req?: Request;
}

// Ne lève jamais : un échec d'écriture du journal ne doit pas faire échouer l'action métier
// (il est loggé en console pour supervision).
export const recordAudit = async (params: AuditParams): Promise<void> => {
  try {
    await AuditLog.create({
      actorUserId: params.actorUserId ?? null,
      actorType: params.actorType,
      companyId: params.companyId ?? null,
      action: params.action,
      objectType: params.objectType ?? null,
      objectId: params.objectId ?? null,
      resultat: params.resultat ?? 'succes',
      details: params.details ? JSON.stringify(params.details) : null,
      ip: params.req?.ip ?? null,
    });
  } catch (error) {
    console.error('[Audit] Écriture du journal impossible :', error);
  }
};

// Journal d'activité entreprise (2026-09-25) : raccourci pour les actions métier des membres d'une
// entreprise (devis envoyé, commande confirmée, facture payée...), visible par l'équipe elle-même
// via GET /companies/me/activity-log — distinct du journal interne ATAABA (actorType 'staff',
// consultable uniquement au back-office). Réutilise la même table AuditLog : même mécanisme,
// même garantie "n'échoue jamais", juste un contexte (l'utilisateur courant) déjà rempli.
export const recordCompanyActivity = async (
  req: AuthenticatedRequest,
  action: string,
  objectType?: string,
  objectId?: number | null,
  details?: Record<string, unknown>
): Promise<void> => {
  await recordAudit({
    actorUserId: req.user!.id,
    actorType: 'company_user',
    companyId: req.user!.companyId!,
    action,
    objectType,
    objectId,
    details,
    req,
  });
};
