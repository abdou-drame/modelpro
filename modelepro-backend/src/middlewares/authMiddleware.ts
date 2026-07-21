import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
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

    const decoded = jwt.verify(token, 'CleSuperSecreteDeMonProjet2026') as { id: number; role: string };

    req.user = {
      id: decoded.id,
      role: decoded.role,
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