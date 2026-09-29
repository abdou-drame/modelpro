import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './authMiddleware';

// À utiliser après `protect` sur toute route Naatalix scoped-entreprise : garantit que le token
// porte un companyId (donc que req.user.companyId peut être utilisé sans risque comme filtre
// d'isolation dans les requêtes Sequelize suivantes).
export const requireCompany = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !req.user.companyId) {
    res.status(403).json({ error: 'Ce compte n\'est rattaché à aucune entreprise.' });
    return;
  }
  next();
};

// À utiliser après `requireCompany`. Contrôle le rôle de l'utilisateur au sein de son entreprise
// (companyRole), distinct du rôle plateforme ModèlePro (req.user.role) contrôlé par restrictTo.
export const requireCompanyRole = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user?.companyRole || !roles.includes(req.user.companyRole)) {
      res.status(403).json({ error: 'Votre rôle dans l\'entreprise ne permet pas cette action.' });
      return;
    }
    next();
  };
};
