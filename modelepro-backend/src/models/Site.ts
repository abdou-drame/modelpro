import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Site/entrepôt pour la gestion de stock par produit et par site (ROADMAP_BACKEND.md §7.5).
// Un "Site principal" est créé automatiquement à l'inscription de l'entreprise (voir
// crmSeedService.seedDefaultSite), utilisé par défaut par les mouvements de stock automatiques
// (réception d'achat, livraison de commande).
export class Site extends Model {
  declare id: number;
  declare companyId: number;
  declare nom: string;
  declare adresse: string | null;
  declare estPrincipal: boolean;
  declare statut: 'actif' | 'inactif';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Site.init(
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
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    estPrincipal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    statut: {
      type: DataTypes.ENUM('actif', 'inactif'),
      allowNull: false,
      defaultValue: 'actif',
    },
  },
  {
    sequelize,
    tableName: 'crm_sites',
    timestamps: true,
  }
);

Site.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Site, { foreignKey: 'companyId', as: 'sites' });

export default Site;
