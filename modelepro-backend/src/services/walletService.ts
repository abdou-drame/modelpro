import { Transaction } from 'sequelize';
import { WalletTransaction } from '../models/WalletTransaction';

// Solde = crédits validés (paiements de commande confirmés) - retraits déjà réservés (en_attente
// ou valide). Un retrait rejeté ne débite jamais le solde final puisqu'il n'a jamais été versé.
// `transaction` optionnel : à fournir pour lire le solde de façon cohérente à l'intérieur d'une
// transaction Sequelize (voir walletController.requestWithdrawal).
export const computeArtisanWalletSolde = async (artisanId: number, transaction?: Transaction): Promise<number> => {
  const transactions = await WalletTransaction.findAll({ where: { artisanId }, transaction });
  return transactions.reduce((total, t) => {
    if (t.type === 'credit' && t.statut === 'valide') return total + t.montant;
    if (t.type === 'retrait' && t.statut !== 'rejete') return total - t.montant;
    return total;
  }, 0);
};
