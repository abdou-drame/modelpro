import crypto from 'crypto';
import { User } from '../models/User';
import { sendEmail } from './emailService';

// OTP par e-mail (Phase 5) — alternative à la 2FA par application (twoFactorService.ts, réservée
// au personnel ATAABA) pour les comptes Naatalix (role = 'entreprise') : pas de secret permanent,
// un code à 6 chiffres généré à chaque usage (connexion, activation, désactivation), valable 10
// minutes, à usage unique. Seul le hash du code est stocké (User.emailOtpCodeHash), jamais le code
// en clair.
const CODE_TTL_MS = 10 * 60 * 1000;
const hashCode = (code: string): string => crypto.createHash('sha256').update(code).digest('hex');

// Génère le code, l'enregistre (hashé, avec expiration) et l'envoie par e-mail — puis retourne le
// code en clair. Ce retour n'est jamais renvoyé dans une réponse HTTP en production (les
// contrôleurs l'ignorent) ; il existe pour que les tests puissent appeler cette fonction
// directement plutôt que d'intercepter un vrai envoi d'e-mail (même principe que twoFactor.test.ts
// qui génère un code TOTP via otplib.authenticator plutôt que de lire un QR code).
export const sendEmailOtp = async (user: User): Promise<string> => {
  if (!user.email) throw new Error('Aucune adresse e-mail enregistrée sur ce compte.');

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  user.emailOtpCodeHash = hashCode(code);
  user.emailOtpExpiresAt = new Date(Date.now() + CODE_TTL_MS);
  await user.save();

  await sendEmail(
    user.email,
    'Votre code de vérification Naatalix',
    `Votre code de vérification est : ${code}\nIl expire dans 10 minutes. Ne le partagez avec personne.`
  );
  return code;
};

// Usage unique : que le code soit valide ou non, un essai le consomme dès qu'il correspond —
// jamais deux vérifications réussies avec le même code.
export const verifyEmailOtp = async (user: User, code: string): Promise<boolean> => {
  if (!user.emailOtpCodeHash || !user.emailOtpExpiresAt) return false;
  if (new Date(user.emailOtpExpiresAt) < new Date()) return false;

  const valid = user.emailOtpCodeHash === hashCode(code);
  if (valid) {
    user.emailOtpCodeHash = null;
    user.emailOtpExpiresAt = null;
    await user.save();
  }
  return valid;
};
