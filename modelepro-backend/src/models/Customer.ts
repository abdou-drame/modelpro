import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { User } from './User';

// Client/Prospect CRM Naatalix (cahier des charges §9, module M02). Ne pas confondre avec le
// modèle ModèlePro `Client` (profil marketplace d'un utilisateur final) : ici, il s'agit d'un
// client ou prospect commercial appartenant à une Company (tenant), table dédiée `crm_customers`
// pour éviter toute ambiguïté.
export class Customer extends Model {
  declare id: number;
  declare companyId: number;
  declare nom: string;
  declare type: 'particulier' | 'entreprise';
  declare statut: 'prospect' | 'client';
  declare email: string | null;
  declare telephone: string | null;
  declare adresse: string | null;
  declare segment: string | null;
  declare notes: string | null;
  declare assignedToUserId: number | null;
  declare convertedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Customer.init(
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
    type: {
      type: DataTypes.ENUM('particulier', 'entreprise'),
      allowNull: false,
      defaultValue: 'entreprise',
    },
    statut: {
      type: DataTypes.ENUM('prospect', 'client'),
      allowNull: false,
      defaultValue: 'prospect',
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
    segment: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assignedToUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'SET NULL',
    },
    convertedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'crm_customers',
    timestamps: true,
  }
);

Customer.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Customer, { foreignKey: 'companyId', as: 'customers' });

Customer.belongsTo(User, { foreignKey: 'assignedToUserId', as: 'assignedTo' });
User.hasMany(Customer, { foreignKey: 'assignedToUserId', as: 'assignedCustomers' });

export default Customer;
