import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { sendEmailOtp, verifyEmailOtp } from '../services/emailOtpService';
import { isSmtpConfigured } from '../services/emailService';

// 2FA par e-mail pour les comptes Naatalix (role = 'entreprise', Phase 5). Toujours en
// libre-service sur le compte appelant lui-même (req.user!.id) — n'importe quel membre de
// l'entreprise protège son propre compte, aucun rôle particulier requis (contrairement au reste
// du module Naatalix, ceci n'affecte que le compte de l'appelant, jamais celui d'un collègue).
const devCodeIfApplicable = (code: string): { devCode?: string } =>
  process.env.NODE_ENV !== 'production' && !isSmtpConfigured() ? { devCode: code } : {};

// POST /api/v1/companies/me/2fa/email/send-code — envoie (ou renvoie) un code à l'adresse e-mail
// du compte. Sert à la fois pour l'activation et pour la désactivation (les deux exigent un code
// fraîchement envoyé), le même mécanisme que pour une connexion.
export const sendCompanyEmailOtp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user || user.role !== 'entreprise') { res.status(403).json({ error: 'Réservé aux comptes Naatalix.' }); return; }
    if (!user.email) { res.status(400).json({ error: 'Ajoutez une adresse e-mail à votre compte avant d\'activer la vérification par e-mail.' }); return; }

    const code = await sendEmailOtp(user);
    res.status(200).json({ message: 'Code envoyé par e-mail.', ...devCodeIfApplicable(code) });
  } catch (error) {
    console.error('Erreur sendCompanyEmailOtp :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/companies/me/2fa/email/enable — body { code }, celui reçu via /send-code.
export const enableCompanyEmailTwoFactor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user || user.role !== 'entreprise') { res.status(403).json({ error: 'Réservé aux comptes Naatalix.' }); return; }

    const { code } = req.body;
    if (!code || !(await verifyEmailOtp(user, String(code)))) {
      res.status(400).json({ error: 'Code invalide ou expiré. Redemandez un code via /2fa/email/send-code.' });
      return;
    }

    user.twoFactorEnabled = true;
    user.twoFactorMethod = 'email';
    await user.save();

    res.status(200).json({ message: 'Vérification par e-mail activée à la connexion.' });
  } catch (error) {
    console.error('Erreur enableCompanyEmailTwoFactor :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/companies/me/2fa/email/disable — body { code }, celui reçu via /send-code.
export const disableCompanyEmailTwoFactor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user || user.role !== 'entreprise' || !user.twoFactorEnabled || user.twoFactorMethod !== 'email') {
      res.status(400).json({ error: 'La vérification par e-mail n\'est pas activée sur ce compte.' });
      return;
    }

    const { code } = req.body;
    if (!code || !(await verifyEmailOtp(user, String(code)))) {
      res.status(400).json({ error: 'Code invalide ou expiré. Redemandez un code via /2fa/email/send-code.' });
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorMethod = null;
    await user.save();

    res.status(200).json({ message: 'Vérification par e-mail désactivée.' });
  } catch (error) {
    console.error('Erreur disableCompanyEmailTwoFactor :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
