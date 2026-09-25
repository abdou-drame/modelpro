import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

// Journal des webhooks PayTrack reçus (côté Naatalix) : garantit l'idempotence (eventId unique)
// et permet au support de suivre les intégrations/erreurs techniques (cahier des charges §14).
export class PaytrackEvent extends Model {
  declare id: number;
  declare eventId: string;
  declare type: string;
  declare companyId: number | null;
  declare payload: string;
  declare statut: 'traite' | 'ignore' | 'anomalie';
  declare message: string | null;
  declare readonly createdAt: Date;
}

PaytrackEvent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    eventId: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    type: { type: DataTypes.STRING(60), allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: true },
    payload: { type: DataTypes.TEXT, allowNull: false },
    statut: { type: DataTypes.ENUM('traite', 'ignore', 'anomalie'), allowNull: false },
    message: { type: DataTypes.STRING(500), allowNull: true },
  },
  { sequelize, tableName: 'integration_paytrack_events', timestamps: true, updatedAt: false }
);

export default PaytrackEvent;
