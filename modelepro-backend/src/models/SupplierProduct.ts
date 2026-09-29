import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Supplier } from './Supplier';
import { Product } from './Product';

// "Produits fournis" : lien entre un fournisseur et un produit du catalogue, avec le prix
// d'achat et les conditions propres à ce fournisseur (ROADMAP_BACKEND.md §7.4).
export class SupplierProduct extends Model {
  declare id: number;
  declare companyId: number;
  declare supplierId: number;
  declare productId: number;
  declare prixAchat: number;
  declare referenceFournisseur: string | null;
  declare delaiLivraison: string | null;
  declare notes: string | null;
}

SupplierProduct.init(
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
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Product, key: 'id' },
      onDelete: 'CASCADE',
    },
    prixAchat: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    referenceFournisseur: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    delaiLivraison: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'crm_supplier_products',
    timestamps: true,
    indexes: [{ unique: true, fields: ['supplier_id', 'product_id'] }],
  }
);

SupplierProduct.belongsTo(Supplier, { foreignKey: 'supplierId', as: 'supplier' });
Supplier.hasMany(SupplierProduct, { foreignKey: 'supplierId', as: 'produitsFournis' });
SupplierProduct.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Product.hasMany(SupplierProduct, { foreignKey: 'productId', as: 'fournisseurs' });

export default SupplierProduct;
