import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Customer } from './Customer';
import { Contact } from './Contact';
import { User } from './User';
import { Site } from './Site';

// Devis (ROADMAP_BACKEND.md §7.1). sousTotal/totalTaxes/totalTTC sont recalculés et stockés à
// chaque mutation de lignes (voir quoteController.recalculateQuoteTotals) — source unique
// d'écriture, pour un affichage liste rapide sans recalcul à chaque lecture.
export class Quote extends Model {
  declare id: number;
  declare companyId: number;
  declare numero: string;
  declare customerId: number;
  declare contactId: number | null;
  // Reporting multisite (2026-09-26, cahier §13 "Consolidation multisite"/"Reporting par site" —
  // Business uniquement). Nullable : une entreprise mono-site n'a pas à en préciser un, et les
  // documents créés avant cette date n'en ont pas.
  declare siteId: number | null;
  declare statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
  declare dateValidite: Date | null;
  declare notes: string | null;
  declare sousTotal: number;
  declare remiseGlobale: number;
  declare totalTaxes: number;
  declare totalTTC: number;
  declare createdByUserId: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Quote.init(
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
    siteId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Site, key: 'id' },
      onDelete: 'SET NULL',
    },
    statut: {
      type: DataTypes.ENUM('brouillon', 'envoye', 'accepte', 'refuse', 'expire'),
      allowNull: false,
      defaultValue: 'brouillon',
    },
    dateValidite: {
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
  },
  {
    sequelize,
    tableName: 'crm_quotes',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'numero'] }],
  }
);

Quote.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Quote.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Quote, { foreignKey: 'customerId', as: 'quotes' });
Quote.belongsTo(Contact, { foreignKey: 'contactId', as: 'contact' });
Quote.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });
Quote.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });

export default Quote;
