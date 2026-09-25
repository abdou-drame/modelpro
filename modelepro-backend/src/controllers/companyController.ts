import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Company } from '../models/Company';
import { User } from '../models/User';
import { hashPassword, generateToken } from '../utils/auth';
import { seedDefaultPipelineStages, seedDefaultSite } from '../services/crmSeedService';
import { createTrialSubscription, checkQuota } from '../services/subscriptionService';
import { saveImageLocally, deleteLocalFile } from '../services/localUploadService';

const COMPANY_ROLES = ['admin', 'manager', 'commercial', 'finance', 'stock', 'readonly'] as const;

/**
 * POST /api/v1/companies/register — public.
 * Crée l'entreprise et son premier utilisateur (companyRole 'admin') en une seule opération,
 * conformément au parcours "création du compte et de l'espace entreprise" du cahier des charges.
 * Les deux créations doivent réussir ensemble (une entreprise sans aucun utilisateur serait
 * inutilisable et invisible pour toujours).
 */
export const registerCompany = async (req: Request, res: Response): Promise<void> => {
  try {
    const { companyNom, ninea, rccm, adresse, companyTelephone, companyEmail, nom, prenom, telephone, email, password } = req.body;

    if (!companyNom || !nom || !prenom || !telephone || !password) {
      res.status(400).json({ error: 'companyNom, nom, prenom, telephone et password sont requis.' });
      return;
    }

    const userExists = await User.findOne({ where: { telephone } });
    if (userExists) {
      res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const { company, owner } = await sequelize.transaction(async (t) => {
      const company = await Company.create({
        nom: companyNom,
        ninea: ninea || null,
        rccm: rccm || null,
        adresse: adresse || null,
        telephone: companyTelephone || null,
        email: companyEmail || null,
        statut: 'actif',
      }, { transaction: t });

      const owner = await User.create({
        nom,
        prenom,
        telephone,
        email: email || null,
        password: hashedPassword,
        role: 'entreprise',
        statut: 'actif',
        companyId: company.id,
        companyRole: 'admin',
      }, { transaction: t });

      await seedDefaultPipelineStages(company.id, t);
      await seedDefaultSite(company.id, t);
      await createTrialSubscription(company.id, t);

      return { company, owner };
    });

    const token = generateToken(owner.id, owner.role, { companyId: company.id, companyRole: owner.companyRole });

    res.status(201).json({
      message: 'Entreprise et compte administrateur créés avec succès.',
      token,
      company,
      user: {
        id: owner.id,
        nom: owner.nom,
        prenom: owner.prenom,
        telephone: owner.telephone,
        role: owner.role,
        companyId: company.id,
        companyRole: owner.companyRole,
      },
    });
  } catch (error) {
    console.error('Erreur registerCompany :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la création de l\'entreprise.' });
  }
};

// GET /api/v1/companies/me — protect + requireCompany
export const getMyCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await Company.findByPk(req.user!.companyId!);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }
    res.status(200).json(company);
  } catch (error) {
    console.error('Erreur getMyCompany :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/companies/me — protect + requireCompany + requireCompanyRole('admin')
export const updateMyCompany = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await Company.findByPk(req.user!.companyId!);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const { nom, ninea, rccm, adresse, telephone, email, logoUrl, coordonneesPaiement, mentionsCommerciales, paytrackActif } = req.body;
    if (nom !== undefined) company.nom = nom;
    if (ninea !== undefined) company.ninea = ninea;
    if (rccm !== undefined) company.rccm = rccm;
    if (adresse !== undefined) company.adresse = adresse;
    if (telephone !== undefined) company.telephone = telephone;
    if (email !== undefined) company.email = email;
    if (logoUrl !== undefined) company.logoUrl = logoUrl;
    if (coordonneesPaiement !== undefined) company.coordonneesPaiement = coordonneesPaiement;
    if (mentionsCommerciales !== undefined) company.mentionsCommerciales = mentionsCommerciales;
    if (paytrackActif !== undefined) company.paytrackActif = Boolean(paytrackActif);
    await company.save();

    res.status(200).json(company);
  } catch (error) {
    console.error('Erreur updateMyCompany :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/companies/me/logo (multipart, champ "logo") — protect + requireCompany +
// requireCompanyRole('admin'). Stockage local sur le disque du VPS (localUploadService), pas
// Cloudinary — le logo reste ensuite utilisable tel quel par pdfService (fetch() sur l'URL
// publique) exactement comme une URL Cloudinary.
export const uploadCompanyLogo = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const company = await Company.findByPk(req.user!.companyId!);
    if (!company) { res.status(404).json({ error: 'Entreprise introuvable.' }); return; }

    const file = req.file as Express.Multer.File | undefined;
    if (!file?.buffer) { res.status(400).json({ error: 'Le logo est requis.' }); return; }

    let logoUrl: string;
    try {
      logoUrl = await saveImageLocally(file.buffer, file.mimetype, 'logos');
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : 'Fichier invalide.' });
      return;
    }

    const ancienLogo = company.logoUrl;
    company.logoUrl = logoUrl;
    await company.save();
    if (ancienLogo) await deleteLocalFile(ancienLogo);

    res.status(200).json({ message: 'Logo mis à jour avec succès.', logoUrl: company.logoUrl });
  } catch (error) {
    console.error('Erreur uploadCompanyLogo :', error);
    res.status(500).json({ error: 'Erreur serveur lors du téléversement du logo.' });
  }
};

// GET /api/v1/companies/members — protect + requireCompany
export const listMembers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const members = await User.findAll({
      where: { companyId: req.user!.companyId! },
      attributes: ['id', 'nom', 'prenom', 'telephone', 'email', 'companyRole', 'statut', 'createdAt'],
      order: [['createdAt', 'ASC']],
    });
    res.status(200).json(members);
  } catch (error) {
    console.error('Erreur listMembers :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// POST /api/v1/companies/members — protect + requireCompany + requireCompanyRole('admin')
export const createMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { nom, prenom, telephone, email, password, companyRole } = req.body;

    if (!nom || !prenom || !telephone || !password || !companyRole) {
      res.status(400).json({ error: 'nom, prenom, telephone, password et companyRole sont requis.' });
      return;
    }
    if (!COMPANY_ROLES.includes(companyRole)) {
      res.status(400).json({ error: `companyRole invalide. Valeurs acceptées : ${COMPANY_ROLES.join(', ')}` });
      return;
    }

    const userExists = await User.findOne({ where: { telephone } });
    if (userExists) {
      res.status(400).json({ error: 'Ce numéro de téléphone est déjà utilisé.' });
      return;
    }

    const quota = await checkQuota(req.user!.companyId!, 'utilisateurs');
    if (!quota.ok) {
      res.status(403).json({
        code: 'QUOTA_EXCEEDED',
        error: `Quota d'utilisateurs atteint (${quota.current}/${quota.max}) pour votre plan. Passez à un plan supérieur.`,
      });
      return;
    }

    const hashedPassword = await hashPassword(password);
    const member = await User.create({
      nom,
      prenom,
      telephone,
      email: email || null,
      password: hashedPassword,
      role: 'entreprise',
      statut: 'actif',
      companyId: req.user!.companyId!,
      companyRole,
    });

    res.status(201).json({
      id: member.id,
      nom: member.nom,
      prenom: member.prenom,
      telephone: member.telephone,
      email: member.email,
      companyRole: member.companyRole,
      statut: member.statut,
    });
  } catch (error) {
    console.error('Erreur createMember :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PATCH /api/v1/companies/members/:id/role — protect + requireCompany + requireCompanyRole('admin')
export const updateMemberRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companyRole } = req.body;
    if (!COMPANY_ROLES.includes(companyRole)) {
      res.status(400).json({ error: `companyRole invalide. Valeurs acceptées : ${COMPANY_ROLES.join(', ')}` });
      return;
    }

    const member = await User.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
    });
    if (!member) { res.status(404).json({ error: 'Membre introuvable dans votre entreprise.' }); return; }

    member.companyRole = companyRole;
    await member.save();

    res.status(200).json({ id: member.id, companyRole: member.companyRole });
  } catch (error) {
    console.error('Erreur updateMemberRole :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/companies/members/:id — protect + requireCompany + requireCompanyRole('admin')
// Retrait "doux" : le membre est détaché de l'entreprise et suspendu plutôt que supprimé, pour
// rester réversible et ne pas casser l'historique (auteur de devis/factures, etc.) une fois ces
// modules ajoutés.
export const removeMember = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const member = await User.findOne({
      where: { id: Number(req.params.id), companyId: req.user!.companyId! },
    });
    if (!member) { res.status(404).json({ error: 'Membre introuvable dans votre entreprise.' }); return; }

    if (member.id === req.user!.id) {
      res.status(400).json({ error: 'Vous ne pouvez pas vous retirer vous-même de l\'entreprise.' });
      return;
    }

    member.statut = 'suspendu';
    member.companyRole = null;
    member.companyId = null;
    await member.save();

    res.status(200).json({ message: 'Membre retiré de l\'entreprise.' });
  } catch (error) {
    console.error('Erreur removeMember :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
