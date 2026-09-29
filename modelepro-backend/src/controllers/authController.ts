import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Artisan } from '../models/Artisan';
import { Pack } from '../models/Pack';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { hashPassword, comparePassword, generateToken, generateTwoFactorPendingToken, verifyTwoFactorPendingToken } from '../utils/auth';
import { verifyTwoFactorCode } from '../services/twoFactorService';
import { sendEmailOtp, verifyEmailOtp } from '../services/emailOtpService';
import { isSmtpConfigured } from '../services/emailService';

// En dev/test sans SMTP configuré, le code OTP est journalisé en console (emailService.ts) mais
// aussi renvoyé ici dans la réponse (`devCode`) pour rester testable sans service SMTP réel —
// jamais en production, y compris si SMTP est mal configuré par erreur.
const devCodeIfApplicable = (code: string): { devCode?: string } =>
  process.env.NODE_ENV !== 'production' && !isSmtpConfigured() ? { devCode: code } : {};

const userLoginPayload = (user: User) => ({
  id: user.id,
  nom: user.nom,
  prenom: user.prenom,
  telephone: user.telephone,
  role: user.role,
  photoUrl: user.photoUrl || null,
  companyId: user.companyId || null,
  companyRole: user.companyRole || null,
  platformRole: user.platformRole || null,
});

// 1. INSCRIPTION (MÉTHODE POST)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nom, prenom, telephone, email, password, role, localisation, métier, atelier, description, horaires, zone } = req.body;

    // Seuls client et artisan peuvent s'inscrire publiquement. Sans ce contrôle en amont, un rôle
    // privilégié (admin, ataaba_staff...) passé dans le corps était créé en base avant le rejet.
    if (role !== 'client' && role !== 'artisan') {
      res.status(400).json({ error: 'Rôle invalide lors de l\'inscription.' });
      return;
    }

    // Vérifier si le numéro de téléphone (identifiant unique de connexion) existe déjà
    const userExists = await User.findOne({ where: { telephone } });
    if (userExists) {
      res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
      return;
    }

    // Chiffrer le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur de base
    const newUser = await User.create({
      nom,
      prenom,
      telephone,
      email,
      password: hashedPassword,
      role,
      statut: 'actif'
    });

    // Créer le profil spécifique selon le rôle sélectionné
    if (role === 'client') {
      await Client.create({ userId: newUser.id, localisation: localisation || null });

      // Générer le jeton JWT pour connecter directement le client après inscription
      const token = generateToken(newUser.id, newUser.role, newUser.sessionVersion);

      res.status(201).json({
        message: 'Compte client créé avec succès !',
        token,
        user: {
          id: newUser.id,
          nom: newUser.nom,
          prenom: newUser.prenom,
          telephone: newUser.telephone,
          role: newUser.role,
          photoUrl: newUser.photoUrl || null,
        }
      });
      return;
    } else if (role === 'artisan') {
      if (!métier || !atelier || !localisation) {
        res.status(400).json({ error: "Le métier, l'atelier et la localisation sont obligatoires pour un artisan." });
        return;
      }

      const packEssentiel = await Pack.findOne({ where: { code: 'essentiel' } });

      await Artisan.create({
        userId: newUser.id,
        métier,
        atelier,
        description,
        localisation,
        horaires: horaires || null,
        zone: zone || null,
        packId: packEssentiel ? packEssentiel.id : null,
      });

      res.status(201).json({
        message: 'Compte artisan créé avec succès et en attente de validation.',
        user: {
          id: newUser.id,
          nom: newUser.nom,
          prenom: newUser.prenom,
          telephone: newUser.telephone,
          role: newUser.role
        }
      });
      return;
    }

    res.status(400).json({ error: 'Rôle invalide lors de l\'inscription.' });
  } catch (error) {
    console.error('Erreur lors de l\'inscription :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l\'inscription.' });
  }
};

const cleanPhone = (p: string) => {
  const digits = p.replace(/\D/g, '');
  if (digits.length === 9) return digits; // ex: 774979236
  if (digits.length === 10 && digits.startsWith('0')) return digits.slice(1); // ex: 0774979236 -> 774979236
  if (digits.length === 12 && digits.startsWith('221')) return digits.slice(3); // ex: 221774979236 -> 774979236
  return digits;
};

// 2. CONNEXION (MÉTHODE POST)
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telephone, email, password } = req.body;
    const identifier = (telephone || email || '').trim();

    if (!identifier) {
      res.status(400).json({ error: 'Veuillez saisir votre numéro de téléphone ou email.' });
      return;
    }

    const phoneNormalized = cleanPhone(identifier);

    // Chercher l'utilisateur par son numéro de téléphone (avec/sans 0 initial) OU par son email
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { telephone: identifier },
          { telephone: phoneNormalized },
          { telephone: `0${phoneNormalized}` },
          { email: identifier }
        ]
      }
    });
    if (!user) {
      res.status(404).json({ error: 'Aucun compte trouvé avec ce numéro de téléphone ou email.' });
      return;
    }

    // Vérifier si le compte n'est pas suspendu par l'administrateur
    if (user.statut === 'suspendu') {
      res.status(403).json({ error: 'Votre compte a été suspendu par l\'administrateur.' });
      return;
    }

    // Si c'est un artisan, vérifier le statut de validation du profil artisan
    if (user.role === 'artisan') {
      const artisanProfile = await Artisan.findOne({ where: { userId: user.id } });
      if (!artisanProfile) {
        res.status(403).json({ error: 'Profil artisan introuvable. Contactez le support.' });
        return;
      }

      if (artisanProfile.statutValidation !== 'valide') {
        res.status(403).json({ error: 'Votre profil artisan est en attente de validation.' });
        return;
      }
    }

    // Valider le mot de passe
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      res.status(400).json({ error: 'Mot de passe incorrect.' });
      return;
    }

    // 2FA activée (Phase 5, cahier des charges §14) : pas de jeton normal tant que le second
    // facteur n'est pas vérifié — voir verifyTwoFactor() ci-dessous. Deux méthodes possibles
    // (twoFactorMethod) : 'totp' (personnel ATAABA, code généré par une application) ou 'email'
    // (comptes Naatalix, code envoyé par e-mail à chaque connexion).
    if (user.twoFactorEnabled && user.twoFactorMethod) {
      const tempToken = generateTwoFactorPendingToken(user.id);
      if (user.twoFactorMethod === 'email') {
        const code = await sendEmailOtp(user);
        res.status(200).json({ requiresTwoFactor: true, method: 'email', tempToken, ...devCodeIfApplicable(code) });
        return;
      }
      res.status(200).json({ requiresTwoFactor: true, method: 'totp', tempToken });
      return;
    }

    // Générer le jeton JWT (les comptes Naatalix embarquent en plus companyId/companyRole)
    const token = generateToken(
      user.id,
      user.role,
      user.sessionVersion,
      user.role === 'entreprise'
        ? { companyId: user.companyId, companyRole: user.companyRole }
        : user.role === 'ataaba_staff'
          ? { platformRole: user.platformRole }
          : undefined
    );

    res.status(200).json({
      message: 'Connexion réussie !',
      token,
      user: userLoginPayload(user),
    });
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la connexion.' });
  }
};

// POST /api/v1/auth/2fa/verify — public (le tempToken fait office d'identification, comme un mot
// de passe à usage unique). Échange le jeton temporaire émis par login() contre le vrai jeton
// d'accès une fois le second facteur vérifié (TOTP ou code e-mail selon twoFactorMethod).
export const verifyTwoFactor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      res.status(400).json({ error: 'tempToken et code sont requis.' });
      return;
    }

    const userId = verifyTwoFactorPendingToken(tempToken);
    if (!userId) {
      res.status(401).json({ error: 'Jeton temporaire invalide ou expiré. Reconnectez-vous.' });
      return;
    }

    const user = await User.findByPk(userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorMethod) {
      res.status(401).json({ error: 'Vérification à deux facteurs indisponible pour ce compte.' });
      return;
    }
    if (user.statut !== 'actif') {
      res.status(403).json({ error: 'Votre compte a été suspendu par l\'administrateur.' });
      return;
    }

    const isValid = user.twoFactorMethod === 'totp'
      ? Boolean(user.twoFactorSecret) && verifyTwoFactorCode(user.twoFactorSecret!, String(code))
      : await verifyEmailOtp(user, String(code));
    if (!isValid) {
      res.status(401).json({ error: 'Code de vérification incorrect ou expiré.' });
      return;
    }

    const token = generateToken(
      user.id,
      user.role,
      user.sessionVersion,
      user.role === 'entreprise'
        ? { companyId: user.companyId, companyRole: user.companyRole }
        : user.role === 'ataaba_staff'
          ? { platformRole: user.platformRole }
          : undefined
    );
    res.status(200).json({
      message: 'Connexion réussie !',
      token,
      user: userLoginPayload(user),
    });
  } catch (error) {
    console.error('Erreur lors de la vérification 2FA :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la vérification.' });
  }
};

// POST /api/v1/auth/logout — protect requis. Déconnexion serveur (Phase 5) : incrémente
// `sessionVersion`, ce qui invalide immédiatement TOUS les jetons émis avant cet appel, sur tous
// les appareils (pas de session par appareil trackée) — authMiddleware.protect compare ce compteur
// à chaque requête. Une reconnexion normale (login) émet un nouveau jeton avec la valeur à jour.
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findByPk(req.user!.id);
    if (!user) { res.status(404).json({ error: 'Utilisateur introuvable.' }); return; }

    user.sessionVersion += 1;
    await user.save();

    res.status(200).json({ message: 'Déconnexion réussie.' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la déconnexion.' });
  }
};