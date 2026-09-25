import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Product } from './Product';
import { Site } from './Site';
import { PurchaseOrder } from './PurchaseOrder';
import { SalesOrder } from './SalesOrder';
import { User } from './User';

// Ledger append-only des mouvements de stock (ROADMAP_BACKEND.md §7.5) — historique consultable,
// jamais modifié après création. `quantite` est le delta signé réellement appliqué au stock
// (positif = entrée/ajustement à la hausse, négatif = sortie/ajustement à la baisse/inventaire à
// la baisse), pour que la somme des mouvements d'un StockItem égale toujours sa quantité
// courante (invariant utile pour l'audit).
export class StockMovement extends Model {
  declare id: number;
  declare companyId: number;
  declare productId: number;
  declare siteId: number;
  declare type: 'entree' | 'sortie' | 'ajustement' | 'inventaire';
  declare quantite: number;
  declare coutUnitaire: number | null;
  declare motif: string | null;
  declare purchaseOrderId: number | null;
  declare salesOrderId: number | null;
  declare createdByUserId: number | null;
  declare readonly createdAt: Date;
}

StockMovement.init(
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
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Product, key: 'id' },
      onDelete: 'CASCADE',
    },
    siteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Site, key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('entree', 'sortie', 'ajustement', 'inventaire'),
      allowNull: false,
    },
    quantite: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    coutUnitaire: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    motif: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    purchaseOrderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: PurchaseOrder, key: 'id' },
      onDelete: 'SET NULL',
    },
    salesOrderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: SalesOrder, key: 'id' },
      onDelete: 'SET NULL',
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
    tableName: 'crm_stock_movements',
    timestamps: true,
    updatedAt: false,
  }
);

StockMovement.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
StockMovement.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
StockMovement.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
StockMovement.belongsTo(SalesOrder, { foreignKey: 'salesOrderId', as: 'salesOrder' });

export default StockMovement;
