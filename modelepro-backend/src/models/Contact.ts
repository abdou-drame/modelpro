import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Customer } from './Customer';

// Personne rattachée à un Customer (client/prospect) CRM Naatalix (cahier des charges §9).
export class Contact extends Model {
  declare id: number;
  declare companyId: number;
  declare customerId: number;
  declare nom: string;
  declare prenom: string | null;
  declare fonction: string | null;
  declare email: string | null;
  declare telephone: string | null;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Contact.init(
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
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Customer, key: 'id' },
      onDelete: 'CASCADE',
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    fonction: {
      type: DataTypes.STRING(100),
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
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'crm_contacts',
    timestamps: true,
  }
);

Contact.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Contact, { foreignKey: 'customerId', as: 'contacts' });

export default Contact;
