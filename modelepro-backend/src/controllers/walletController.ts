import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware';
import sequelize from '../config/database';
import { Artisan } from '../models/Artisan';
import { WalletTransaction } from '../models/WalletTransaction';
import { computeArtisanWalletSolde } from '../services/walletService';

// 1. Wallet de l'artisan connecté : solde disponible + historique des mouvements (crédits de
// commande, demandes de retrait avec leur statut).
export const getMyWallet = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) { res.status(404).json({ error: 'Profil artisan introuvable.' }); return; }

    const transactions = await WalletTransaction.findAll({
      where: { artisanId: artisan.id },
      order: [['createdAt', 'DESC']],
    });

    const solde = transactions.reduce((total, t) => {
      if (t.type === 'credit' && t.statut === 'valide') return total + t.montant;
      if (t.type === 'retrait' && t.statut !== 'rejete') return total - t.montant;
      return total;
    }, 0);

    res.status(200).json({ solde, transactions });
  } catch (error) {
    console.error('Erreur getMyWallet :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la récupération du wallet.' });
  }
};

// 2. Demande de retrait : réserve immédiatement le montant (statut en_attente) en attendant que
// l'admin envoie manuellement les fonds via Wave/Orange Money (voir processWithdrawalRequest,
// adminController.ts) — PayTech ne permet pas de reversement automatique vers l'artisan.
export const requestWithdrawal = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: 'Utilisateur non authentifié.' }); return; }

    const artisan = await Artisan.findOne({ where: { userId } });
    if (!artisan) { res.status(404).json({ error: 'Profil artisan introuvable.' }); return; }

    const { montant, moyenPaiement } = req.body;
    const montantNumber = Number(montant);

    if (!montantNumber || montantNumber <= 0) {
      res.status(400).json({ error: 'Montant de retrait invalide.' });
      return;
    }

    if (moyenPaiement !== 'wave' && moyenPaiement !== 'orange_money') {
      res.status(400).json({ error: 'Moyen de paiement invalide (wave ou orange_money).' });
      return;
    }

    const numeroReception = moyenPaiement === 'wave' ? artisan.waveNumber : artisan.orangeMoneyNumber;
    if (!numeroReception) {
      res.status(400).json({
        error: `Aucun numéro ${moyenPaiement === 'wave' ? 'Wave' : 'Orange Money'} enregistré sur votre profil. Ajoutez-le avant de demander un retrait.`,
      });
      return;
    }

    // Verrouille la ligne artisan pendant la vérification + réservation du solde : sans ça, deux
    // demandes de retrait simultanées pourraient toutes deux lire un solde suffisant avant que
    // l'une des deux n'ait été committée (double retrait au-delà du solde réel disponible).
    let insufficientBalance: number | null = null;
    const retrait = await sequelize.transaction(async (t) => {
      await Artisan.findByPk(artisan.id, { transaction: t, lock: t.LOCK.UPDATE });
      const solde = await computeArtisanWalletSolde(artisan.id, t);
      if (montantNumber > solde) {
        insufficientBalance = solde;
        return null;
      }
      return WalletTransaction.create({
        artisanId: artisan.id,
        type: 'retrait',
        montant: montantNumber,
        statut: 'en_attente',
        moyenPaiement,
        numeroReception,
      }, { transaction: t });
    });

    if (insufficientBalance !== null) {
      res.status(400).json({ error: `Solde insuffisant. Solde disponible : ${insufficientBalance} FCFA.` });
      return;
    }

    res.status(201).json(retrait);
  } catch (error) {
    console.error('Erreur requestWithdrawal :', error);
    res.status(500).json({ error: 'Une erreur est survenue lors de la demande de retrait.' });
  }
};
