import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';

export const createModel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const { titre, description, photoUrl, prixEstimatif } = req.body;
    if (!titre) {
      res.status(400).json({ error: 'Le titre du modèle est requis.' });
      return;
    }

    const creation = await Creation.create({
      artisanId: artisan.id,
      titre,
      description,
      photoUrl,
      prixEstimatif,
    });

    res.status(201).json(creation);
  } catch (error) {
    console.error('Erreur création de modèle :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l’ajout du modèle.' });
  }
};

export const getMyModels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const creations = await Creation.findAll({ where: { artisanId: artisan.id } });
    res.status(200).json(creations);
  } catch (error) {
    console.error('Erreur récupération des modèles :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération des modèles.' });
  }
};

export const deleteModel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Utilisateur non authentifié.' });
      return;
    }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    const { id } = req.params;
    const creationId = String(id);
    const creation = await Creation.findByPk(creationId);

    if (!creation) {
      res.status(404).json({ error: 'Modèle introuvable.' });
      return;
    }

    if (creation.artisanId !== artisan.id) {
      res.status(403).json({ error: 'Vous ne pouvez pas supprimer un modèle qui n’appartient pas à votre catalogue.' });
      return;
    }

    await creation.destroy();
    res.status(200).json({ message: 'Modèle supprimé avec succès.' });
  } catch (error) {
    console.error('Erreur suppression du modèle :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la suppression du modèle.' });
  }
};
