import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// TOTP (Google Authenticator, Authy, etc.) pour le personnel ATAABA (Phase 5, cahier des charges
// §14 "accès réservé, journalisé"). Tolérance de dérive d'horloge par défaut d'otplib (±1 pas de
// 30s) volontairement conservée : assez stricte pour un brute-force, assez souple pour un
// téléphone légèrement désynchronisé.
const ISSUER = 'Naatalix ATAABA';

export const generateTwoFactorSecret = (accountLabel: string): { secret: string; otpauthUrl: string } => {
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(accountLabel, ISSUER, secret);
  return { secret, otpauthUrl };
};

export const generateQrCodeDataUrl = (otpauthUrl: string): Promise<string> => QRCode.toDataURL(otpauthUrl);

export const verifyTwoFactorCode = (secret: string, code: string): boolean => {
  try {
    return authenticator.verify({ token: code, secret });
  } catch {
    return false;
  }
};
