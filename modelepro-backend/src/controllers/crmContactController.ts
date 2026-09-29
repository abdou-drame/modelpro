import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import { Customer } from '../models/Customer';
import { Contact } from '../models/Contact';

// POST /api/v1/crm/customers/:customerId/contacts
export const createContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customerId = Number(req.params.customerId);

    const customer = await Customer.findOne({ where: { id: customerId, companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    const { nom, prenom, fonction, email, telephone, notes } = req.body;
    if (!nom) { res.status(400).json({ error: 'nom requis.' }); return; }

    const contact = await Contact.create({
      companyId,
      customerId,
      nom,
      prenom: prenom || null,
      fonction: fonction || null,
      email: email || null,
      telephone: telephone || null,
      notes: notes || null,
    });

    res.status(201).json(contact);
  } catch (error) {
    console.error('Erreur createContact :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// GET /api/v1/crm/customers/:customerId/contacts
export const listContacts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const customerId = Number(req.params.customerId);

    const customer = await Customer.findOne({ where: { id: customerId, companyId } });
    if (!customer) { res.status(404).json({ error: 'Client/prospect introuvable.' }); return; }

    const contacts = await Contact.findAll({ where: { customerId, companyId }, order: [['createdAt', 'ASC']] });
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Erreur listContacts :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// PUT /api/v1/crm/contacts/:id
export const updateContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const contact = await Contact.findOne({ where: { id: Number(req.params.id), companyId } });
    if (!contact) { res.status(404).json({ error: 'Contact introuvable.' }); return; }

    const { nom, prenom, fonction, email, telephone, notes } = req.body;
    if (nom !== undefined) contact.nom = nom;
    if (prenom !== undefined) contact.prenom = prenom;
    if (fonction !== undefined) contact.fonction = fonction;
    if (email !== undefined) contact.email = email;
    if (telephone !== undefined) contact.telephone = telephone;
    if (notes !== undefined) contact.notes = notes;
    await contact.save();

    res.status(200).json(contact);
  } catch (error) {
    console.error('Erreur updateContact :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};

// DELETE /api/v1/crm/contacts/:id
export const deleteContact = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user!.companyId!;
    const contact = await Contact.findOne({ where: { id: Number(req.params.id), companyId } });
    if (!contact) { res.status(404).json({ error: 'Contact introuvable.' }); return; }

    await contact.destroy();
    res.status(200).json({ message: 'Contact supprimé.' });
  } catch (error) {
    console.error('Erreur deleteContact :', error);
    res.status(500).json({ error: 'Une erreur est survenue.' });
  }
};
