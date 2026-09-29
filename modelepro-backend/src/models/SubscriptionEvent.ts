import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Historique des changements d'abonnement (cahier des charges §13 "Historique : conserver les
// changements de plan et périodes de souscription"). Append-only.
export class SubscriptionEvent extends Model {
  declare id: number;
  declare companyId: number;
  declare type: string;
  declare fromPlanId: number | null;
  declare toPlanId: number | null;
  declare statut: string | null;
  declare actorUserId: number | null;
  declare note: string | null;
  declare readonly createdAt: Date;
}

SubscriptionEvent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Company, key: 'id' },
      onDelete: 'CASCADE',
    },
    type: { type: DataTypes.STRING(40), allowNull: false },
    fromPlanId: { type: DataTypes.INTEGER, allowNull: true },
    toPlanId: { type: DataTypes.INTEGER, allowNull: true },
    statut: { type: DataTypes.STRING(20), allowNull: true },
    actorUserId: { type: DataTypes.INTEGER, allowNull: true },
    note: { type: DataTypes.STRING(500), allowNull: true },
  },
  { sequelize, tableName: 'saas_subscription_events', timestamps: true, updatedAt: false }
);

export default SubscriptionEvent;
