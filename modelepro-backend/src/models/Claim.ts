import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Order } from './Order';
import { User } from './User';

export class Claim extends Model {
  declare id: number;
  declare orderId: number | null;
  declare clientId: number;
  declare sujet: string;
  declare description: string | null;
  declare preuvePhotoUrl: string | null;
  declare statut: 'en_attente' | 'en_cours' | 'resolu' | 'rejete';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Claim.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'orders', key: 'id' },
      onDelete: 'SET NULL',
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    sujet: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    preuvePhotoUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'en_cours', 'resolu', 'rejete'),
      defaultValue: 'en_attente',
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'claims',
  }
);

Order.hasMany(Claim, { foreignKey: 'orderId', as: 'claims' });
Claim.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
User.hasMany(Claim, { foreignKey: 'clientId', as: 'clientClaims' });
Claim.belongsTo(User, { foreignKey: 'clientId', as: 'client' });

export default Claim;
