import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Invoice } from './Invoice';
import { Product } from './Product';

// Ligne de facture — même structure et même logique de calcul que QuoteLine/SalesOrderLine.
export class InvoiceLine extends Model {
  declare id: number;
  declare invoiceId: number;
  declare productId: number | null;
  declare designation: string;
  declare quantite: number;
  declare prixUnitaire: number;
  declare remisePct: number;
  declare tauxTaxe: number;
  declare ordre: number;
}

InvoiceLine.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    invoiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Invoice, key: 'id' },
      onDelete: 'CASCADE',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Product, key: 'id' },
      onDelete: 'SET NULL',
    },
    designation: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    quantite: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 1,
    },
    prixUnitaire: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    remisePct: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    tauxTaxe: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'crm_invoice_lines',
    timestamps: true,
  }
);

InvoiceLine.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });
Invoice.hasMany(InvoiceLine, { foreignKey: 'invoiceId', as: 'lignes' });
InvoiceLine.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export default InvoiceLine;
