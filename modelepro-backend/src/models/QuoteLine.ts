import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Quote } from './Quote';
import { Product } from './Product';

// Ligne de devis. Les totaux de ligne (HT/TTC) ne sont pas stockés : ils sont déterministes à
// partir de quantite/prixUnitaire/remisePct/tauxTaxe et recalculés à la volée (voir
// quoteController.computeLineTotals) pour éviter toute divergence avec les valeurs stockées.
export class QuoteLine extends Model {
  declare id: number;
  declare quoteId: number;
  declare productId: number | null;
  declare designation: string;
  declare quantite: number;
  declare prixUnitaire: number;
  declare remisePct: number;
  declare tauxTaxe: number;
  declare ordre: number;
}

QuoteLine.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    quoteId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Quote, key: 'id' },
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
    tableName: 'crm_quote_lines',
    timestamps: true,
  }
);

QuoteLine.belongsTo(Quote, { foreignKey: 'quoteId', as: 'quote' });
Quote.hasMany(QuoteLine, { foreignKey: 'quoteId', as: 'lignes' });
QuoteLine.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

export default QuoteLine;
