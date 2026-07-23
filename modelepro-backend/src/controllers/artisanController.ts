import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Op, fn, col } from 'sequelize';
import sequelize from '../config/database';
import { Artisan } from '../models/Artisan';
import { User } from '../models/User';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Moteur de recherche avancé (Localisation, zone, métier, atelier) - Seuls les artisans VALIDÉS sont retournés
export const searchArtisans = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { metier, atelier, localisation, zone } = req.query;
    const artisanConditions: any = {
      statutValidation: 'valide',
    };

    const likeOp = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;

    if (metier) {
      artisanConditions.métier = { [likeOp]: `%${metier}%` };
    }

    if (atelier) {
      artisanConditions.atelier = { [likeOp]: `%${atelier}%` };
    }

    if (zone) {
      artisanConditions.zone = { [likeOp]: `%${zone}%` };
    }

    if (localisation) {
      if (sequelize.getDialect() === 'postgres') {
        artisanConditions[Op.and] = [
          sequelize.where(
            fn('unaccent', col('localisation')),
            { [Op.iLike]: fn('unaccent', `%${localisation}%`) }
          )
        ];
      } else {
        artisanConditions.localisation = { [Op.like]: `%${localisation}%` };
      }
    }

    const artisans = await Artisan.findAll({
      where: artisanConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['nom', 'prenom', 'telephone', 'email', 'photoUrl'],
          where: { statut: 'actif' }
        }
      ]
    });

    res.status(200).json(artisans);
  } catch (error) {
    console.error('Erreur lors de la recherche :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la recherche.' });
  }
};

// 2. Modification du profil connecté
export const updateArtisanProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role !== 'artisan') {
      res.status(403).json({ error: 'Accès interdit. Seul un artisan peut modifier ce profil.' });
      return;
    }

    const { nom, prenom, telephone, métier, atelier, description, localisation, horaires, zone } = req.body;

    // Mise à jour de la table commune 'users'
    await User.update(
      { nom, prenom, telephone },
      { where: { id: userId } }
    );

    // Mise à jour de la table spécifique 'artisans'
    await Artisan.update(
      { métier, atelier, description, localisation, horaires, zone },
      { where: { userId } }
    );

    res.status(200).json({ message: 'Profil artisan mis à jour avec succès !' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la mise à jour du profil.' });
  }
};

// 3. Récupération du profil de l'artisan connecté
export const getMyProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role !== 'artisan') {
      res.status(403).json({ error: 'Accès interdit. Seul un artisan peut accéder à ces informations.' });
      return;
    }

    const artisan = await Artisan.findOne({
      where: { userId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['nom', 'prenom', 'telephone', 'email', 'photoUrl']
        }
      ]
    });

    if (!artisan) {
      res.status(404).json({ error: 'Profil artisan introuvable.' });
      return;
    }

    res.status(200).json(artisan);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du profil.' });
  }
};

// 4. Upload de photos d'atelier (Artisan)
export const uploadAtelierPhotos = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) { res.status(404).json({ error: 'Profil artisan introuvable.' }); return; }

    const files = req.files as Express.Multer.File[] | undefined;
    const singleFile = req.file as Express.Multer.File | undefined;

    const uploadedUrls: string[] = [];
    const filesToProcess = files || (singleFile ? [singleFile] : []);

    for (const f of filesToProcess) {
      if (f.buffer) {
        const fileName = `atelier-${Date.now()}-${f.originalname}`;
        const destPath = path.join(uploadDir, fileName);
        fs.writeFileSync(destPath, f.buffer);
        uploadedUrls.push(`/uploads/${fileName}`);
      }
    }

    if (uploadedUrls.length === 0) {
      res.status(400).json({ error: 'Aucun fichier valide fourni.' });
      return;
    }

    const currentPhotos = artisan.photosAtelier ? JSON.parse(artisan.photosAtelier) : [];
    const updatedPhotos = [...currentPhotos, ...uploadedUrls];
    artisan.photosAtelier = JSON.stringify(updatedPhotos);
    await artisan.save();

    res.status(200).json({ message: 'Photos de l\'atelier téléversées avec succès.', photos: updatedPhotos });
  } catch (error) {
    console.error('Erreur uploadAtelierPhotos :', error);
    res.status(500).json({ error: 'Erreur serveur lors du téléversement.' });
  }
};

// 5. Soumission d'un document de validation professionnel
export const uploadValidationDocument = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) { res.status(404).json({ error: 'Profil artisan introuvable.' }); return; }

    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer) {
      res.status(400).json({ error: 'Le fichier justificatif est requis.' });
      return;
    }

    const fileName = `doc-${Date.now()}-${file.originalname}`;
    const destPath = path.join(uploadDir, fileName);
    fs.writeFileSync(destPath, file.buffer);

    artisan.documentValidation = `/uploads/${fileName}`;
    artisan.statutValidation = 'en_attente';
    await artisan.save();

    res.status(200).json({ message: 'Document de validation soumis avec succès.', documentValidation: artisan.documentValidation });
  } catch (error) {
    console.error('Erreur uploadValidationDocument :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la soumission du document.' });
  }
};