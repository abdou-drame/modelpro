import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

export class Pack extends Model {
  declare id: number;
  declare code: 'essentiel' | 'pro' | 'business';
  declare nom: string;
  declare prixMensuel: number;
  declare prixAnnuel: number;
  declare limiteModelesActifs: number | null;
  declare actif: boolean;
}

Pack.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.ENUM('essentiel', 'pro', 'business'),
      allowNull: false,
      unique: true,
    },
    nom: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    prixMensuel: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    prixAnnuel: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    limiteModelesActifs: {
      // null = illimité
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    actif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    sequelize,
    tableName: 'packs',
    timestamps: true,
  }
);

export default Pack;
