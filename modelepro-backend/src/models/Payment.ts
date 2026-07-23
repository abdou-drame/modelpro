import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Order } from './Order';

export class Payment extends Model {
  declare id: number;
  declare orderId: number;
  declare montant: number;
  declare type: 'acompte' | 'solde' | 'integral' | 'frais_service';
  declare moyen: 'wave' | 'orange_money' | 'free_money' | 'especes';
  declare statut: 'en_attente' | 'confirme' | 'echoue' | 'rembourse';
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
      allowNull: false,
      references: { model: 'orders', key: 'id' },
      onDelete: 'CASCADE',
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('acompte', 'solde', 'integral', 'frais_service'),
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
  },
  {
    sequelize,
    tableName: 'payments',
  }
);

Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

export default Payment;
