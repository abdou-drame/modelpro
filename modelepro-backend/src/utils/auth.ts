import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/database';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

export const generateToken = (
  userId: number,
  role: string,
  companyContext?: { companyId?: number | null; companyRole?: string | null; platformRole?: string | null }
): string => {
  return jwt.sign(
    { id: userId, role, ...(companyContext ?? {}) },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Jeton temporaire émis à la place du jeton normal quand un compte staff a la 2FA activée
// (login()) : volontairement dépourvu de `role`/`platformRole` et rejeté explicitement par
// authMiddleware.protect (`purpose: '2fa_pending'`) — inutilisable comme jeton d'accès, seule
// verifyTwoFactor() sait l'échanger contre le vrai jeton après vérification du code TOTP.
export const generateTwoFactorPendingToken = (userId: number): string => {
  return jwt.sign({ id: userId, purpose: '2fa_pending' }, JWT_SECRET, { expiresIn: '5m' });
};

export const verifyTwoFactorPendingToken = (token: string): number | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; purpose?: string };
    return decoded.purpose === '2fa_pending' ? decoded.id : null;
  } catch {
    return null;
  }
};