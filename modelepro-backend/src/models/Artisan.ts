import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';

export class Artisan extends Model {
  declare id: number;
  declare userId: number;
  declare métier: string;
  declare atelier: string;
  declare description: string | null;
  declare localisation: string;
  declare experience: number | null;
  declare noteMoyenne: number | null;
  declare statutValidation: 'en_attente' | 'valide' | 'rejete';
}

Artisan.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id', // <--- FORCE LE MAPPING AVEC LA COLONNE POSTGRESQL
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    métier: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    atelier: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    experience: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    noteMoyenne: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      allowNull: false,
      field: 'note_moyenne', // <--- CORRESPONDANCE AVEC LA BASE
    },
    statutValidation: {
      type: DataTypes.ENUM('en_attente', 'valide', 'rejete'),
      defaultValue: 'en_attente',
      allowNull: false,
      field: 'statut_validation', // <--- CORRESPONDANCE AVEC LA BASE
    },
    localisation: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'artisans',
    timestamps: false, // Pas de createdAt/updatedAt automatiques ici
  }
);

User.hasOne(Artisan, { foreignKey: 'user_id', as: 'artisanProfile' });
Artisan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });