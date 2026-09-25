import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Catalogue produits/services CRM Naatalix (cahier des charges M04, ROADMAP_BACKEND.md §6.5).
// Modèle Naatalix séparé de `Creation` (ModèlePro, couplé à Artisan/marketplace) — même choix que
// pour Customer/CrmTask : `Creation.artisanId` est NOT NULL et référence `artisans`, l'étendre
// aurait exigé de le rendre nullable et d'ajouter companyId, avec risque de régression sur le
// catalogue artisan existant. Ce modèle sert aussi de base aux lignes de devis en Phase 2.
export class Product extends Model {
  declare id: number;
  declare companyId: number;
  declare reference: string | null;
  declare nom: string;
  declare description: string | null;
  declare type: 'produit' | 'service';
  declare categorie: string | null;
  declare prixUnitaire: number;
  declare tauxTaxe: number;
  declare unite: string | null;
  declare statut: 'actif' | 'inactif';
  declare disponible: boolean;
  // JSON encodé en texte (variantes simples : tailles, couleurs...), même convention que
  // `Creation.options`/`Creation.photos` dans le modèle ModèlePro existant.
  declare variantes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Product.init(
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
    reference: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    nom: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('produit', 'service'),
      allowNull: false,
      defaultValue: 'produit',
    },
    categorie: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    prixUnitaire: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    tauxTaxe: {
      // Pourcentage (ex. 18 pour 18% de TVA), paramétrable par produit.
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    unite: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('actif', 'inactif'),
      allowNull: false,
      defaultValue: 'actif',
    },
    disponible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    variantes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'crm_products',
    timestamps: true,
  }
);

Product.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Product, { foreignKey: 'companyId', as: 'products' });

export default Product;
