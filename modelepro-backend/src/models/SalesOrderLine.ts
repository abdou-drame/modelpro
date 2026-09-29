import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { SalesOrder } from './SalesOrder';
import { Product } from './Product';

// Ligne de commande commerciale Naatalix — même structure et même logique de calcul que
// QuoteLine (totaux jamais stockés, recalculés à la volée), pour rester cohérent lors d'une
// conversion devis → commande.
export class SalesOrderLine extends Model {
  declare id: number;
  declare salesOrderId: number;
  declare productId: number | null;
  declare designation: string;
  declare quantite: number;
  declare prixUnitaire: number;
  declare remisePct: number;
  declare tauxTaxe: number;
  declare ordre: number;
}

SalesOrderLine.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    salesOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: SalesOrder, key: 'id' },
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
    tableName: 'crm_sales_order_lines',
    timestamps: true,
  }
);

SalesOrderLine.belongsTo(SalesOrder, { foreignKey: 'salesOrderId', as: 'salesOrder' });
SalesOrder.hasMany(SalesOrderLine, { foreignKey: 'salesOrderId', as: 'lignes' });
SalesOrderLine.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export default SalesOrderLine;
