import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Customer } from './Customer';
import { Contact } from './Contact';
import { SalesOrder } from './SalesOrder';
import { User } from './User';

// Facture Naatalix (ROADMAP_BACKEND.md §7.3). Modèle Naatalix séparé du `Payment` ModèlePro
// (paiements marketplace via PayTech/Wave/Orange Money) — voir InvoicePayment pour les
// règlements manuels Naatalix, distincts eux aussi.
//
// `statut` = cycle de vie du document (brouillon/envoyee/annulee) ; `paymentStatus` = état de
// règlement dérivé des InvoicePayment enregistrés (impayee/partiellement_payee/payee), recalculé
// par invoiceController.recalculateInvoicePayments — mêmes deux axes orthogonaux que
// Order.statut / Order.paymentStatus déjà utilisés côté ModèlePro.
export class Invoice extends Model {
  declare id: number;
  declare companyId: number;
  declare numero: string;
  declare customerId: number;
  declare contactId: number | null;
  declare salesOrderId: number | null;
  declare type: 'facture' | 'avoir';
  declare avoirDeFactureId: number | null;
  declare statut: 'brouillon' | 'envoyee' | 'annulee';
  declare paymentStatus: 'impayee' | 'partiellement_payee' | 'payee';
  declare dateEmission: Date;
  declare dateEcheance: Date | null;
  declare notes: string | null;
  declare sousTotal: number;
  declare remiseGlobale: number;
  declare totalTaxes: number;
  declare totalTTC: number;
  declare montantPaye: number;
  declare soldeRestant: number;
  declare createdByUserId: number | null;
  // Anti-doublon des relances de paiement natives (services/paymentReminderService.ts) : une fois
  // vraie, plus jamais renvoyée pour cette facture (dateEcheance non modifiable après envoi).
  declare rappelEcheanceEnvoye: boolean;
  declare alerteRetardEnvoyee: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Invoice.init(
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
    numero: {
      type: DataTypes.STRING(30),
      allowNull: false,
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Customer, key: 'id' },
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Contact, key: 'id' },
      onDelete: 'SET NULL',
    },
    salesOrderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: SalesOrder, key: 'id' },
      onDelete: 'SET NULL',
    },
    type: {
      type: DataTypes.ENUM('facture', 'avoir'),
      allowNull: false,
      defaultValue: 'facture',
    },
    avoirDeFactureId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'crm_invoices', key: 'id' },
      onDelete: 'SET NULL',
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'envoyee', 'annulee'),
      allowNull: false,
      defaultValue: 'brouillon',
    },
    paymentStatus: {
      type: DataTypes.ENUM('impayee', 'partiellement_payee', 'payee'),
      allowNull: false,
      defaultValue: 'impayee',
    },
    dateEmission: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    dateEcheance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sousTotal: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    remiseGlobale: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    totalTaxes: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    totalTTC: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    montantPaye: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    soldeRestant: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'SET NULL',
    },
    rappelEcheanceEnvoye: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    alerteRetardEnvoyee: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    sequelize,
    tableName: 'crm_invoices',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'numero'] }],
  }
);

Invoice.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Invoice.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Invoice, { foreignKey: 'customerId', as: 'invoices' });
Invoice.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Invoice.belongsTo(SalesOrder, { foreignKey: 'salesOrderId', as: 'salesOrder' });
SalesOrder.hasOne(Invoice, { foreignKey: 'salesOrderId', as: 'invoice' });
Invoice.belongsTo(Invoice, { foreignKey: 'avoirDeFactureId', as: 'factureOrigine' });
Invoice.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

export default Invoice;
