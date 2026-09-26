import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Supplier } from './Supplier';
import { SupplierContact } from './SupplierContact';
import { User } from './User';
import { Site } from './Site';

// Commande fournisseur (ROADMAP_BACKEND.md §7.4). Même principe que SalesOrder côté ventes :
// `statut` (cycle du document) + `historiqueStatuts` (trace légère, pas un audit trail
// générique) ; `montantPaye`/`soldeRestant` suivent les règlements faits AU fournisseur
// (PurchaseOrderPayment), répondant à "historique et soldes" de la roadmap.
export class PurchaseOrder extends Model {
  declare id: number;
  declare companyId: number;
  declare numero: string;
  declare supplierId: number;
  declare contactId: number | null;
  // Reporting multisite (2026-09-26) — voir Quote.siteId. Ici : le site RÉCEPTEUR de la commande.
  declare siteId: number | null;
  declare statut: 'brouillon' | 'envoyee' | 'confirmee' | 'recue' | 'annulee';
  declare dateCommande: Date;
  declare dateEcheance: Date | null;
  declare notes: string | null;
  declare sousTotal: number;
  declare remiseGlobale: number;
  declare totalTaxes: number;
  declare totalTTC: number;
  declare montantPaye: number;
  declare soldeRestant: number;
  declare createdByUserId: number | null;
  declare historiqueStatuts: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PurchaseOrder.init(
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
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Supplier, key: 'id' },
    },
    contactId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: SupplierContact, key: 'id' },
      onDelete: 'SET NULL',
    },
    siteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Site, key: 'id' },
      onDelete: 'SET NULL',
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'envoyee', 'confirmee', 'recue', 'annulee'),
      allowNull: false,
      defaultValue: 'brouillon',
    },
    dateCommande: {
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
    historiqueStatuts: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'crm_purchase_orders',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'numero'] }],
  }
);

PurchaseOrder.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(PurchaseOrder, { foreignKey: 'supplierId', as: 'purchaseOrders' });
PurchaseOrder.belongsTo(SupplierContact, { foreignKey: 'contactId', as: 'contact' });
PurchaseOrder.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
PurchaseOrder.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });

export default PurchaseOrder;
