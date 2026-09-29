import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Product } from './Product';
import { Site } from './Site';

// Niveau de stock courant d'un produit sur un site (ROADMAP_BACKEND.md §7.5). Valeur mise en
// cache, recalculée uniquement par services/stockService.applyStockMovement (point d'écriture
// unique) — jamais modifiée directement ailleurs.
export class StockItem extends Model {
  declare id: number;
  declare companyId: number;
  declare productId: number;
  declare siteId: number;
  declare quantite: number;
  declare seuilAlerte: number | null;
  // Coût moyen pondéré (CMP), mis à jour à chaque entrée avec coût connu — sert à la
  // "valorisation simple" (quantite * coutMoyenPondere).
  declare coutMoyenPondere: number;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

StockItem.init(
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
    quantite: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    seuilAlerte: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    coutMoyenPondere: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'crm_stock_items',
    timestamps: true,
    indexes: [{ unique: true, fields: ['product_id', 'site_id'] }],
  }
);

StockItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
StockItem.belongsTo(Site, { foreignKey: 'siteId', as: 'site' });
Product.hasMany(StockItem, { foreignKey: 'productId', as: 'stockItems' });
Site.hasMany(StockItem, { foreignKey: 'siteId', as: 'stockItems' });

export default StockItem;
