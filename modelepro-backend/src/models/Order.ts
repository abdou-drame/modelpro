import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Artisan } from './Artisan';
import { User } from './User';

export class Order extends Model {
  declare id: number;
  declare artisanId: number;
  declare clientId: number;
  declare mesures: string | null;
  declare photoTissu: string | null;
  declare consignes: string | null;
  declare prix: number;
  declare statut: 'en_cours' | 'en_finition' | 'prete' | 'livree';
  // Phase 2
  declare deliveryDate: Date | null;
  declare deliveryDateReason: string | null;
  declare totalPrice: number | null;
  declare depositAmount: number | null;
  declare paymentStatus: 'unpaid' | 'deposit_paid' | 'fully_paid';
  declare customizationText: string | null;
  declare customizationPhoto: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Order.init(
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
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    mesures: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    photoTissu: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    consignes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prix: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    statut: {
      type: DataTypes.ENUM('en_cours', 'en_finition', 'prete', 'livree'),
      allowNull: false,
      defaultValue: 'en_cours',
    },
    // Phase 2
    deliveryDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deliveryDateReason: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    totalPrice: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    depositAmount: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    paymentStatus: {
      type: DataTypes.ENUM('unpaid', 'deposit_paid', 'fully_paid'),
      allowNull: false,
      defaultValue: 'unpaid',
    },
    customizationText: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    customizationPhoto: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'orders',
  }
);

Artisan.hasMany(Order, { foreignKey: 'artisanId', as: 'orders' });
Order.belongsTo(Artisan, { foreignKey: 'artisanId', as: 'artisan' });
User.hasMany(Order, { foreignKey: 'clientId', as: 'clientOrders' });
Order.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
