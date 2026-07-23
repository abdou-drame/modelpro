import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Artisan } from '../models/Artisan';
import { Creation } from '../models/Creation';
import sequelize from '../config/database';

import { Op } from 'sequelize';

export const getAllModels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { metierId, artisanId, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;
    
    const condition: any = {};
    if (artisanId) condition.artisanId = Number(artisanId);
    if (minPrice || maxPrice) {
      condition.prixEstimatif = {};
      if (minPrice) condition.prixEstimatif[Op.gte] = Number(minPrice);
      if (maxPrice) condition.prixEstimatif[Op.lte] = Number(maxPrice);
    }
    if (search) {
      const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
      condition[Op.or] = [
        { titre: { [likeOp]: `%${search}%` } },
        { description: { [likeOp]: `%${search}%` } }
      ];
    }
    
    // Pour metierId, il faut filtrer sur la table artisan incluse
    const artisanCondition: any = {};
    // Note: metier dans Artisan est une string. Si metierId est passé, soit adapter la BD, soit chercher par métier (string)
    // Ici on suppose que le paramètre s'appelle metier ou metierId.
    if (metierId) artisanCondition.métier = String(metierId);

    const offset = (Number(page) - 1) * Number(limit);

    const { count, rows } = await Creation.findAndCountAll({
      where: condition,
      include: [
        { 
          model: Artisan, 
          as: 'artisan',
          where: Object.keys(artisanCondition).length > 0 ? artisanCondition : undefined
        }
      ],
      limit: Number(limit),
      offset
    });

    res.status(200).json({
      data: rows,
      total: count,
      page: Number(page),
      totalPages: Math.ceil(count / Number(limit))
    });
  } catch (error) {
    console.error('Erreur récupération du catalogue :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du catalogue.' });
  }
};

export const getModelById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);
    const creation = await Creation.findByPk(id, { include: [{ model: Artisan, as: 'artisan' }] });
    if (!creation) {
      res.status(404).json({ error: 'Modèle introuvable.' });
      return;
    }
    res.status(200).json(creation);
  } catch (error) {
    console.error('Erreur récupération du modèle :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du modèle.' });
  }
};

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

    const { titre, description, photoUrl, prixEstimatif, delaiEstime, options, categorie, photos } = req.body;
    if (!titre) {
      res.status(400).json({ error: 'Le titre du modèle est requis.' });
      return;
    }

    const creation = await Creation.create({
      artisanId: artisan.id,
      titre,
      description: description || null,
      photoUrl: photoUrl || null,
      prixEstimatif: prixEstimatif ? Number(prixEstimatif) : null,
      delaiEstime: delaiEstime || null,
      options: options || null,
      categorie: categorie || null,
      photos: Array.isArray(photos) ? JSON.stringify(photos) : (typeof photos === 'string' ? photos : null),
    });

    res.status(201).json(creation);
  } catch (error) {
    console.error('Erreur création de modèle :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de l’ajout du modèle.' });
  }
};

export const updateModel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const creation = await Creation.findByPk(String(id));

    if (!creation) {
      res.status(404).json({ error: 'Modèle introuvable.' });
      return;
    }

    if (creation.artisanId !== artisan.id) {
      res.status(403).json({ error: 'Vous ne pouvez pas modifier un modèle qui n’appartient pas à votre catalogue.' });
      return;
    }

    const { titre, description, photoUrl, prixEstimatif, delaiEstime, options, categorie, photos } = req.body;

    if (titre !== undefined) creation.titre = titre;
    if (description !== undefined) creation.description = description;
    if (photoUrl !== undefined) creation.photoUrl = photoUrl;
    if (prixEstimatif !== undefined) creation.prixEstimatif = prixEstimatif ? Number(prixEstimatif) : null;
    if (delaiEstime !== undefined) creation.delaiEstime = delaiEstime;
    if (options !== undefined) creation.options = options;
    if (categorie !== undefined) creation.categorie = categorie;
    if (photos !== undefined) creation.photos = Array.isArray(photos) ? JSON.stringify(photos) : photos;

    await creation.save();

    res.status(200).json(creation);
  } catch (error) {
    console.error('Erreur mise à jour du modèle :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du modèle.' });
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
