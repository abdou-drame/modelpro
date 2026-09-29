import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { PurchaseOrder } from './PurchaseOrder';
import { Product } from './Product';

// Ligne de commande fournisseur — même structure/logique que QuoteLine/SalesOrderLine/InvoiceLine.
export class PurchaseOrderLine extends Model {
  declare id: number;
  declare purchaseOrderId: number;
  declare productId: number | null;
  declare designation: string;
  declare quantite: number;
  declare prixUnitaire: number;
  declare remisePct: number;
  declare tauxTaxe: number;
  declare ordre: number;
}

PurchaseOrderLine.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    purchaseOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: PurchaseOrder, key: 'id' },
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
    tableName: 'crm_purchase_order_lines',
    timestamps: true,
  }
);

PurchaseOrderLine.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
PurchaseOrder.hasMany(PurchaseOrderLine, { foreignKey: 'purchaseOrderId', as: 'lignes' });
PurchaseOrderLine.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export default PurchaseOrderLine;
