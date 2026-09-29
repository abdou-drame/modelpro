import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';
import { User } from '../models/User';

// Contrôle d'accès du back-office ATAABA (cahier des charges F-019 : "accès réservé, journalisé
// et séparé des comptes clients"). Contrairement à requireCompany, ce realm est cross-entreprises :
// il est donc revalidé en base à CHAQUE requête (compte toujours existant, actif, rôle plateforme
// courant) plutôt que de se fier au seul JWT — une suspension ou rétrogradation de staff est
// effective immédiatement.
export const requirePlatformStaff = (...allowed: Array<'superadmin' | 'support' | 'readonly'>) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'ataaba_staff') {
        res.status(403).json({ error: 'Accès réservé au personnel ATAABA.' });
        return;
      }

      const staff = await User.findByPk(req.user.id);
      if (!staff || staff.role !== 'ataaba_staff' || staff.statut !== 'actif' || !staff.platformRole) {
        res.status(403).json({ error: 'Accès réservé au personnel ATAABA.' });
        return;
      }

      if (allowed.length > 0 && !allowed.includes(staff.platformRole)) {
        res.status(403).json({ error: 'Votre rôle plateforme ne permet pas cette action.' });
        return;
      }

      req.user.platformRole = staff.platformRole;
      next();
    } catch (error) {
      console.error('Erreur requirePlatformStaff :', error);
      res.status(500).json({ error: 'Une erreur est survenue.' });
    }
  };
};
