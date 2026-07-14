import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Artisan } from './Artisan';

export class Creation extends Model {
  declare id: number;
  declare artisanId: number;
  declare titre: string;
  declare description: string | null;
  declare photoUrl: string | null;
  declare prixEstimatif: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Creation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    artisanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'artisans', key: 'id' },
      onDelete: 'CASCADE',
    },
    titre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photoUrl: {
      type: DataTypes.STRING(255),
      allowNull: true, // Contiendra le lien de la photo du catalogue
    },
    prixEstimatif: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'creations',
  }
);

// Définition de la relation : Un artisan a plusieurs créations
Artisan.hasMany(Creation, { foreignKey: 'artisanId', as: 'catalogue' });
Creation.belongsTo(Artisan, { foreignKey: 'artisanId', as: 'artisan' });