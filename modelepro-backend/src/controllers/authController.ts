import { Request, Response } from 'express';
import { User } from '../models/User';
import { Client } from '../models/Client';
import { Artisan } from '../models/Artisan';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';

// 1. INSCRIPTION (MÉTHODE POST)
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { nom, prenom, telephone, email, password, role, localisation, métier, atelier, description, horaires, zone } = req.body;

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
      if (!localisation) {
        res.status(400).json({ error: 'La localisation est obligatoire pour un client.' });
        return;
      }
      await Client.create({ userId: newUser.id, localisation });

      // Générer le jeton JWT pour connecter directement le client après inscription
      const token = generateToken(newUser.id, newUser.role);

      res.status(201).json({
        message: 'Compte client créé avec succès !',
        token,
        user: {
          id: newUser.id,
          nom: newUser.nom,
          prenom: newUser.prenom,
          telephone: newUser.telephone,
          role: newUser.role
        }
      });
      return;
    } else if (role === 'artisan') {
      if (!métier || !atelier || !localisation) {
        res.status(400).json({ error: "Le métier, l'atelier et la localisation sont obligatoires pour un artisan." });
        return;
      }

      await Artisan.create({
        userId: newUser.id,
        métier,
        atelier,
        description,
        localisation,
        horaires: horaires || null,
        zone: zone || null
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

// 2. CONNEXION (MÉTHODE POST)
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { telephone, password } = req.body;

    // Chercher l'utilisateur par son numéro de téléphone
    const user = await User.findOne({ where: { telephone } });
    if (!user) {
      res.status(404).json({ error: 'Aucun compte trouvé avec ce numéro de téléphone.' });
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

    // Générer le jeton JWT
    const token = generateToken(user.id, user.role);

    res.status(200).json({
      message: 'Connexion réussie !',
      token,
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        telephone: user.telephone,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erreur lors de la connexion :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la connexion.' });
  }
};