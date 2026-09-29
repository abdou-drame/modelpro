import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Invoice } from './Invoice';

// Demande de paiement d'une facture Naatalix transmise à PayTrack (cahier des charges §7.1).
// Naatalix ne stocke que la référence et le statut : l'exécution du paiement reste chez PayTrack.
export class PaytrackTransaction extends Model {
  declare id: number;
  declare companyId: number;
  declare invoiceId: number;
  declare montant: number;
  declare devise: string;
  declare referenceInterne: string;
  declare externalReference: string | null;
  declare paymentUrl: string | null;
  declare statut: 'initie' | 'confirme' | 'echoue' | 'annule';
  declare invoicePaymentId: number | null;
  declare createdByUserId: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PaytrackTransaction.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Company, key: 'id' }, onDelete: 'CASCADE' },
    invoiceId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Invoice, key: 'id' }, onDelete: 'CASCADE' },
    montant: { type: DataTypes.FLOAT, allowNull: false },
    devise: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'FCFA' },
    referenceInterne: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    externalReference: { type: DataTypes.STRING(120), allowNull: true },
    paymentUrl: { type: DataTypes.TEXT, allowNull: true },
    statut: { type: DataTypes.ENUM('initie', 'confirme', 'echoue', 'annule'), allowNull: false, defaultValue: 'initie' },
    invoicePaymentId: { type: DataTypes.INTEGER, allowNull: true },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: true },
  },
  { sequelize, tableName: 'crm_paytrack_transactions', timestamps: true }
);

PaytrackTransaction.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Invoice.hasMany(PaytrackTransaction, { foreignKey: 'invoiceId', as: 'paytrackTransactions' });

export default PaytrackTransaction;
