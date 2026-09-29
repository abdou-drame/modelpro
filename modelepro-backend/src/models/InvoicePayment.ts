import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Invoice } from './Invoice';
import { User } from './User';

// Règlement manuel Naatalix (ROADMAP_BACKEND.md §7.3). Distinct du `Payment` ModèlePro
// (marketplace, PayTech/Wave/Orange Money) — Naatalix doit fonctionner sans PayTrack avec des
// règlements enregistrés manuellement (Cahier des charges §7 / F-009).
export class InvoicePayment extends Model {
  declare id: number;
  declare companyId: number;
  declare invoiceId: number;
  declare montant: number;
  declare datePaiement: Date;
  declare moyen: 'especes' | 'virement' | 'cheque' | 'mobile_money' | 'autre';
  declare reference: string | null;
  declare notes: string | null;
  declare createdByUserId: number | null;
  declare readonly createdAt: Date;
}

InvoicePayment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Company, key: 'id' },
      onDelete: 'CASCADE',
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Invoice, key: 'id' },
      onDelete: 'CASCADE',
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    datePaiement: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    moyen: {
      type: DataTypes.ENUM('especes', 'virement', 'cheque', 'mobile_money', 'autre'),
      allowNull: false,
      defaultValue: 'especes',
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'crm_invoice_payments',
    timestamps: true,
    updatedAt: false,
  }
);

InvoicePayment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Invoice.hasMany(InvoicePayment, { foreignKey: 'invoiceId', as: 'paiements' });

export default InvoicePayment;
