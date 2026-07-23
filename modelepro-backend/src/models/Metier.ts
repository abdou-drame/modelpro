import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Metier extends Model {
  declare id: number;
  declare nom: string;
  declare description: string | null;
  declare actif: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Metier.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    actif: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'metiers',
  }
);

export default Metier;
