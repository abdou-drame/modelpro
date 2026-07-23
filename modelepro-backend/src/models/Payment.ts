import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Order } from './Order';
import { Artisan } from './Artisan';

export class Payment extends Model {
  declare id: number;
  declare orderId: number | null;
  declare artisanId: number | null;
  declare montant: number;
  declare type: 'acompte' | 'solde' | 'integral' | 'frais_service' | 'abonnement';
  declare moyen: 'wave' | 'orange_money' | 'free_money' | 'especes';
  declare statut: 'en_attente' | 'confirme' | 'echoue' | 'rembourse';
  declare referenceTransaction: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Payment.init(
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
      onDelete: 'CASCADE',
    },
    artisanId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'artisans', key: 'id' },
      onDelete: 'SET NULL',
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('acompte', 'solde', 'integral', 'frais_service', 'abonnement'),
      allowNull: false,
    },
    moyen: {
      type: DataTypes.ENUM('wave', 'orange_money', 'free_money', 'especes'),
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM('en_attente', 'confirme', 'echoue', 'rembourse'),
      defaultValue: 'en_attente',
      allowNull: false,
    },
    referenceTransaction: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'payments',
  }
);

Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Artisan.hasMany(Payment, { foreignKey: 'artisanId', as: 'payments' });
Payment.belongsTo(Artisan, { foreignKey: 'artisanId', as: 'artisan' });

export default Payment;
