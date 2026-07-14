import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Artisan } from './Artisan';
import { User } from './User';

export class Appointment extends Model {
  declare id: number;
  declare artisanId: number;
  declare clientId: number;
  declare statut: 'pending' | 'confirme' | 'annule';
  declare date: Date | null;
  declare notes: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Appointment.init(
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
    statut: {
      type: DataTypes.ENUM('pending', 'confirme', 'annule'),
      defaultValue: 'pending',
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'appointments',
  }
);

Artisan.hasMany(Appointment, { foreignKey: 'artisanId', as: 'appointments' });
Appointment.belongsTo(Artisan, { foreignKey: 'artisanId', as: 'artisan' });
User.hasMany(Appointment, { foreignKey: 'clientId', as: 'clientAppointments' });
Appointment.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
