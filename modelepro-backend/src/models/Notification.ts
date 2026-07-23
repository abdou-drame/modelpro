import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';

export class Notification extends Model {
  declare id: number;
  declare userId: number;
  declare type: 'nouveau_message' | 'demande_rdv' | 'rdv_statut' | 'commande_statut' | 'rappel' | 'notation' | 'paiement';
  declare titre: string;
  declare description: string;
  declare lu: boolean;
  declare referenceId: number | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Notification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('nouveau_message', 'demande_rdv', 'rdv_statut', 'commande_statut', 'rappel', 'notation', 'paiement'),
      allowNull: false,
    },
    titre: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    lu: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'notifications',
  }
);

User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });
