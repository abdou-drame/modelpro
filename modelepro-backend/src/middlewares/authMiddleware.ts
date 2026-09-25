import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
    // Naatalix uniquement — absents/null pour les comptes ModèlePro (client/artisan/admin).
    companyId?: number | null;
    companyRole?: string | null;
    // Back-office ATAABA uniquement (role = 'ataaba_staff').
    platformRole?: string | null;
  };
  file?: any;
  files?: any;
}

export const protect = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1].trim();
    }

    if (!token) {
      res.status(401).json({ error: 'Accès refusé. Aucun jeton fourni.' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      role: string;
      companyId?: number | null;
      companyRole?: string | null;
      platformRole?: string | null;
      purpose?: string;
    };

    // Jeton temporaire émis par login() en attente de vérification 2FA (voir authController.ts) :
    // volontairement dépourvu de `role`/`platformRole`, mais rejeté explicitement ici en défense
    // en profondeur — il ne doit jamais servir de jeton d'accès normal.
    if (decoded.purpose === '2fa_pending') {
      res.status(401).json({ error: 'Vérification à deux facteurs requise.' });
      return;
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      companyId: decoded.companyId ?? null,
      companyRole: decoded.companyRole ?? null,
      platformRole: decoded.platformRole ?? null,
    };

    next();
  } catch (error) {
    console.log("--> Le middleware a rejeté le token à cause de :", error instanceof Error ? error.message : error);
    res.status(401).json({ error: 'Jeton invalide ou expiré.' });
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Accès interdit. Vous n’avez pas les autorisations nécessaires.' });
      return;
    }
    next();
  };
};