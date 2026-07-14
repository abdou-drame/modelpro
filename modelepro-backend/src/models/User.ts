import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';


  export class User extends Model {
  declare id: number;
  declare nom: string;
  declare prenom: string;
  declare telephone: string;
  declare email: string | null;
  declare password: string;
  declare role: 'client' | 'artisan' | 'admin';
  declare statut: 'actif' | 'suspendu';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('client', 'artisan', 'admin'),
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM('actif', 'suspendu'),
      defaultValue: 'actif',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'users',
  }
);