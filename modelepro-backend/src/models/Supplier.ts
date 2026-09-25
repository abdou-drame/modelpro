import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Fournisseur CRM Naatalix (ROADMAP_BACKEND.md §7.4).
export class Supplier extends Model {
  declare id: number;
  declare companyId: number;
  declare nom: string;
  declare ninea: string | null;
  declare email: string | null;
  declare telephone: string | null;
  declare adresse: string | null;
  declare conditionsPaiement: string | null;
  declare notes: string | null;
  declare statut: 'actif' | 'inactif';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Supplier.init(
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
    nom: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    ninea: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    telephone: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    conditionsPaiement: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('actif', 'inactif'),
      allowNull: false,
      defaultValue: 'actif',
    },
  },
  {
    sequelize,
    tableName: 'crm_suppliers',
    timestamps: true,
  }
);

Supplier.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Supplier, { foreignKey: 'companyId', as: 'suppliers' });

export default Supplier;
