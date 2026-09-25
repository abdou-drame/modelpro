import { Request } from 'express';
import { AuditLog } from '../models/AuditLog';

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
