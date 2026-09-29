import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { CompanySubscription } from '../models/CompanySubscription';
import { effectiveStatus, isReadOnlyStatus, hasFeature } from '../services/subscriptionService';

const READ_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// À placer après requireCompany (cahier des charges F-018/R10) : une entreprise suspendue,
// expirée ou annulée CONSERVE l'accès en lecture (consultation, PDF, exports) mais perd toutes les
// actions d'écriture. Une entreprise sans abonnement (créée avant la Phase 4) n'est pas bloquée.
export const enforceSubscription = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (READ_METHODS.includes(req.method)) { next(); return; }

    const sub = await CompanySubscription.findOne({ where: { companyId: req.user!.companyId! } });
    if (sub && isReadOnlyStatus(effectiveStatus(sub))) {
      res.status(402).json({
        code: 'SUBSCRIPTION_INACTIVE',
        error: 'Votre abonnement est inactif : l\'espace est en lecture seule. Contactez ATAABA pour le réactiver.',
      });
      return;
    }
    next();
  } catch (error) {
    console.error('Erreur enforceSubscription :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// À placer après enforceSubscription : un module non inclus dans le plan de l'entreprise (ex.
// Stock/Fournisseurs/Rentabilité/Dashboard réservés à Pro et plus) est bloqué en lecture ET en
// écriture — contrairement à enforceSubscription qui ne bloque que l'écriture, l'accès à une
// fonctionnalité non souscrite n'a pas de sens même en lecture seule.
export const requireFeature = (feature: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!(await hasFeature(req.user!.companyId!, feature))) {
        res.status(403).json({
          code: 'FEATURE_NOT_IN_PLAN',
          error: `Cette fonctionnalité n'est pas incluse dans votre formule d'abonnement. Passez à une formule supérieure pour y accéder.`,
        });
        return;
      }
      next();
    } catch (error) {
      console.error('Erreur requireFeature :', error);
      res.status(500).json({ error: 'Une erreur est survenue.' });
    }
  };
};
