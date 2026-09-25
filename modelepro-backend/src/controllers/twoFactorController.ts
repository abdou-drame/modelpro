import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { User } from '../models/User';
import { generateTwoFactorSecret, generateQrCodeDataUrl, verifyTwoFactorCode } from '../services/twoFactorService';
import { recordAudit } from '../services/auditService';

// 2FA en libre-service pour le personnel ATAABA (Phase 5, cahier des charges §14 "accès réservé,
// journalisé"). setup/confirm/disable agissent toujours sur req.user!.id (le compte staff appelant
// lui-même) — jamais sur un id passé en paramètre, pour éviter qu'un membre du staff désactive la
// 2FA d'un collègue sans passer par le filet de récupération superadmin (resetStaffTwoFactor).

// POST /api/v1/backoffice/2fa/setup — génère un nouveau secret (écrase un enrôlement précédent non
// confirmé) et renvoie de quoi l'ajouter dans une application d'authentification (Google
// Authenticator, Authy...). N'active rien tant que /2fa/confirm n'a pas vérifié un premier code.
export const setupTwoFactor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user || user.role !== 'ataaba_staff') { res.status(403).json({ error: 'Réservé au personnel ATAABA.' }); return; }

    const { secret, otpauthUrl } = generateTwoFactorSecret(user.telephone);
    user.twoFactorSecret = secret;
    user.twoFactorEnabled = false;
    await user.save();

    const qrCodeDataUrl = await generateQrCodeDataUrl(otpauthUrl);
    res.status(200).json({ otpauthUrl, qrCodeDataUrl });
  } catch (error) {
    console.error('Erreur setupTwoFactor :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/backoffice/2fa/confirm — body { code }. Active la 2FA une fois qu'un premier code
// valide confirme que l'application d'authentification est bien synchronisée avec le secret.
export const confirmTwoFactor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user || user.role !== 'ataaba_staff' || !user.twoFactorSecret) {
      res.status(400).json({ error: 'Aucun enrôlement 2FA en attente. Lancez /2fa/setup d\'abord.' });
      return;
    }

    const { code } = req.body;
    if (!code || !verifyTwoFactorCode(user.twoFactorSecret, String(code))) {
      res.status(400).json({ error: 'Code invalide.' });
      return;
    }

    user.twoFactorEnabled = true;
    user.twoFactorMethod = 'totp';
    await user.save();
    await recordAudit({ actorUserId: user.id, actorType: 'staff', action: '2fa_enabled', objectType: 'user', objectId: user.id, req });

    res.status(200).json({ message: 'Authentification à deux facteurs activée.' });
  } catch (error) {
    console.error('Erreur confirmTwoFactor :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/backoffice/2fa/disable — body { code } : exige un code TOTP valide (pas seulement
// la session en cours) pour désactiver soi-même sa 2FA.
export const disableTwoFactor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user || user.role !== 'ataaba_staff' || !user.twoFactorEnabled || !user.twoFactorSecret) {
      res.status(400).json({ error: 'La 2FA n\'est pas activée sur ce compte.' });
      return;
    }

    const { code } = req.body;
    if (!code || !verifyTwoFactorCode(user.twoFactorSecret, String(code))) {
      res.status(400).json({ error: 'Code invalide.' });
      return;
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorMethod = null;
    await user.save();
    await recordAudit({ actorUserId: user.id, actorType: 'staff', action: '2fa_disabled', objectType: 'user', objectId: user.id, req });

    res.status(200).json({ message: 'Authentification à deux facteurs désactivée.' });
  } catch (error) {
    console.error('Erreur disableTwoFactor :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/backoffice/staff/:id/2fa/reset — superadmin uniquement. Filet de récupération si un
// membre du staff perd l'accès à son application d'authentification (téléphone perdu/cassé) : lève
// la 2FA sur le compte ciblé sans exiger de code, journalisé avec l'identité de l'auteur.
export const resetStaffTwoFactor = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const target = await User.findOne({ where: { id: Number(req.params.id), role: 'ataaba_staff' } });
    if (!target) { res.status(404).json({ error: 'Membre du personnel introuvable.' }); return; }

    target.twoFactorEnabled = false;
    target.twoFactorSecret = null;
    target.twoFactorMethod = null;
    await target.save();
    await recordAudit({
      actorUserId: req.user!.id, actorType: 'staff', action: '2fa_reset_by_admin',
      objectType: 'user', objectId: target.id, req,
    });

    res.status(200).json({ message: '2FA réinitialisée pour ce compte.' });
  } catch (error) {
    console.error('Erreur resetStaffTwoFactor :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
