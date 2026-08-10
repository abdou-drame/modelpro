import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Artisan } from './Artisan';
import { Order } from './Order';
import { Payment } from './Payment';

// Ledger du wallet artisan : chaque paiement de commande confirmé (acompte/solde/integral,
// jamais abonnement ni frais_service qui restent des revenus plateforme) crédite ce ledger.
// Un retrait débite le solde dès la demande (fonds réservés) ; s'il est rejeté par l'admin,
// le montant est recrédité. Voir applyConfirmedOrderPaymentEffect (paymentController.ts) pour
// le crédit automatique, et walletController.ts / adminController.ts pour les retraits.
export class WalletTransaction extends Model {
  declare id: number;
  declare artisanId: number;
  declare orderId: number | null;
  declare paymentId: number | null;
  declare type: 'credit' | 'retrait';
  declare montant: number;
  declare statut: 'valide' | 'en_attente' | 'rejete';
  declare moyenPaiement: 'wave' | 'orange_money' | null;
  declare numeroReception: string | null;
  declare commentaireAdmin: string | null;
  declare traiteAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WalletTransaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    artisanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'artisan_id',
      references: { model: 'artisans', key: 'id' },
      onDelete: 'CASCADE',
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'order_id',
      references: { model: 'orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'payment_id',
      references: { model: 'payments', key: 'id' },
      onDelete: 'SET NULL',
    },
    type: {
      type: DataTypes.ENUM('credit', 'retrait'),
      allowNull: false,
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM('valide', 'en_attente', 'rejete'),
      allowNull: false,
      defaultValue: 'valide',
    },
    moyenPaiement: {
      type: DataTypes.ENUM('wave', 'orange_money'),
      allowNull: true,
      field: 'moyen_paiement',
    },
    numeroReception: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'numero_reception',
    },
    commentaireAdmin: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'commentaire_admin',
    },
    traiteAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'traite_at',
    },
  },
  {
    sequelize,
    tableName: 'wallet_transactions',
  }
);

Artisan.hasMany(WalletTransaction, { foreignKey: 'artisan_id', as: 'walletTransactions' });
WalletTransaction.belongsTo(Artisan, { foreignKey: 'artisan_id', as: 'artisan' });

Order.hasMany(WalletTransaction, { foreignKey: 'order_id', as: 'walletTransactions' });
WalletTransaction.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Payment.hasOne(WalletTransaction, { foreignKey: 'payment_id', as: 'walletTransaction' });
WalletTransaction.belongsTo(Payment, { foreignKey: 'payment_id', as: 'payment' });

export default WalletTransaction;
