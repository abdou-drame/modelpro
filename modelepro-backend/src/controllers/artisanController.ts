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

    const results = artisans.map((a) => {
      const json = a.toJSON();
      let photosAtelier = json.photosAtelier;
      if (typeof photosAtelier === 'string') {
        try { photosAtelier = JSON.parse(photosAtelier); } catch { photosAtelier = []; }
      }
      if (!Array.isArray(photosAtelier)) photosAtelier = [];
      return {
        ...json,
        photosAtelier,
        photoProfil: json.user?.photoUrl || null,
      };
    });

    res.status(200).json(results);
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

    // Mise à jour sélective de la table commune 'users'
    const userUpdateData: any = {};
    if (nom !== undefined) userUpdateData.nom = nom;
    if (prenom !== undefined) userUpdateData.prenom = prenom;
    if (telephone !== undefined) userUpdateData.telephone = telephone;

    if (Object.keys(userUpdateData).length > 0) {
      await User.update(userUpdateData, { where: { id: userId } });
    }

    // Mise à jour sélective de la table spécifique 'artisans'
    const artisanUpdateData: any = {};
    if (métier !== undefined) artisanUpdateData.métier = métier;
    if (atelier !== undefined) artisanUpdateData.atelier = atelier;
    if (description !== undefined) artisanUpdateData.description = description;
    if (localisation !== undefined) artisanUpdateData.localisation = localisation;
    if (horaires !== undefined) artisanUpdateData.horaires = horaires;
    if (zone !== undefined) artisanUpdateData.zone = zone;

    if (Object.keys(artisanUpdateData).length > 0) {
      await Artisan.update(artisanUpdateData, { where: { userId } });
    }

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

    const json = artisan.toJSON();
    let photosAtelier = json.photosAtelier;
    if (typeof photosAtelier === 'string') {
      try { photosAtelier = JSON.parse(photosAtelier); } catch { photosAtelier = []; }
    }
    if (!Array.isArray(photosAtelier)) photosAtelier = [];

    res.status(200).json({
      ...json,
      photosAtelier,
      photoProfil: json.user?.photoUrl || null,
    });
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
        const safeName = (f.originalname || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const fileName = `atelier-${Date.now()}-${safeName}`;
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

    const safeName = (file.originalname || 'doc.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `doc-${Date.now()}-${safeName}`;
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

// 6. Upload de la photo de profil (Avatar Artisan)
export const uploadAvatarPhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer) {
      res.status(400).json({ error: 'La photo de profil est requise.' });
      return;
    }

    const safeName = (file.originalname || 'avatar.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `avatar-${Date.now()}-${safeName}`;
    const destPath = path.join(uploadDir, fileName);
    fs.writeFileSync(destPath, file.buffer);

    const photoUrl = `/uploads/${fileName}`;
    await User.update({ photoUrl }, { where: { id: userId } });

    res.status(200).json({ message: 'Photo de profil mise à jour avec succès.', photoUrl });
  } catch (error) {
    console.error('Erreur uploadAvatarPhoto :', error);
    res.status(500).json({ error: 'Erreur serveur lors du téléversement de la photo de profil.' });
  }
};

// 7. Suppression d'une photo d'atelier (Artisan)
export const deleteAtelierPhoto = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) { res.status(404).json({ error: 'Profil artisan introuvable.' }); return; }

    const photoUrl = (req.body?.photoUrl || req.query?.photoUrl || '') as string;
    if (!photoUrl) {
      res.status(400).json({ error: 'L\'URL de la photo à supprimer est requise.' });
      return;
    }

    let currentPhotos: string[] = [];
    if (artisan.photosAtelier) {
      if (typeof artisan.photosAtelier === 'string') {
        try { currentPhotos = JSON.parse(artisan.photosAtelier); } catch { currentPhotos = []; }
      } else if (Array.isArray(artisan.photosAtelier)) {
        currentPhotos = artisan.photosAtelier;
      }
    }

    const cleanTarget = photoUrl.replace(/^https?:\/\/[^\/]+/, '');

    const updatedPhotos = currentPhotos.filter((p) => {
      const cleanP = p.replace(/^https?:\/\/[^\/]+/, '');
      return cleanP !== cleanTarget && p !== photoUrl;
    });

    artisan.photosAtelier = JSON.stringify(updatedPhotos);
    await artisan.save();

    if (cleanTarget.startsWith('/uploads/')) {
      const fileName = cleanTarget.replace('/uploads/', '');
      const filePath = path.join(uploadDir, fileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (err) { console.warn('Impossible de supprimer le fichier physique :', err); }
      }
    }

    res.status(200).json({ message: 'Photo d\'atelier supprimée avec succès.', photos: updatedPhotos });
  } catch (error) {
    console.error('Erreur deleteAtelierPhoto :', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de la photo.' });
  }
};