import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Supplier } from './Supplier';

// Contact rattaché à un fournisseur — même structure que Contact (CRM client).
export class SupplierContact extends Model {
  declare id: number;
  declare companyId: number;
  declare supplierId: number;
  declare nom: string;
  declare prenom: string | null;
  declare fonction: string | null;
  declare email: string | null;
  declare telephone: string | null;
  declare notes: string | null;
}

SupplierContact.init(
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
    supplierId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Supplier, key: 'id' },
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
    tableName: 'crm_supplier_contacts',
    timestamps: true,
  }
);

SupplierContact.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(SupplierContact, { foreignKey: 'supplierId', as: 'contacts' });

export default SupplierContact;
