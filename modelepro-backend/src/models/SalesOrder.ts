import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Customer } from './Customer';
import { Contact } from './Contact';
import { Quote } from './Quote';
import { User } from './User';
import { Site } from './Site';

// Commande commerciale Naatalix (ROADMAP_BACKEND.md §7.2). Modèle volontairement distinct du
// modèle `Order` ModèlePro (commandes artisan/marketplace, couplé à Artisan/Creation) — même
// choix que pour Customer/CrmTask/Product : aucune table ModèlePro existante n'est touchée,
// donc aucune régression possible sur `orders`.
export class SalesOrder extends Model {
  declare id: number;
  declare companyId: number;
  declare numero: string;
  declare customerId: number;
  declare contactId: number | null;
  declare quoteId: number | null;
  // Reporting multisite (2026-09-26) — voir Quote.siteId.
  declare siteId: number | null;
  declare statut: 'brouillon' | 'confirmee' | 'en_preparation' | 'livree' | 'annulee';
  declare dateCommande: Date;
  declare dateLivraisonPrevue: Date | null;
  declare notes: string | null;
  declare sousTotal: number;
  declare remiseGlobale: number;
  declare totalTaxes: number;
  declare totalTTC: number;
  declare createdByUserId: number | null;
  // Historique léger des transitions de statut ([{statut, date, userId}], JSON en texte) —
  // spécifique à cette entité, pas un audit trail générique (celui-ci reste prévu séparément,
  // entité AuditLog, Phase 5).
  declare historiqueStatuts: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SalesOrder.init(
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
    quoteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Quote, key: 'id' },
      onDelete: 'SET NULL',
    },
    siteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Site, key: 'id' },
      onDelete: 'SET NULL',
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'confirmee', 'en_preparation', 'livree', 'annulee'),
      allowNull: false,
      defaultValue: 'brouillon',
    },
    dateCommande: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    dateLivraisonPrevue: {
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
    tableName: 'crm_sales_orders',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'numero'] }],
  }
);

SalesOrder.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
SalesOrder.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(SalesOrder, { foreignKey: 'customerId', as: 'salesOrders' });
SalesOrder.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
SalesOrder.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
Quote.hasOne(SalesOrder, { foreignKey: 'quoteId', as: 'salesOrder' });
SalesOrder.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
SalesOrder.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });

export default SalesOrder;
