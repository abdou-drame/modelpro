import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

// Journal d'audit append-only (cahier des charges §9 entité AuditLog, F-020 : "acteur, action,
// objet, horodatage, résultat, contexte technique"). Jamais modifié ni supprimé par l'API.
export class AuditLog extends Model {
  declare id: number;
  declare actorUserId: number | null;
  declare actorType: 'staff' | 'company_user' | 'system' | 'webhook';
  declare companyId: number | null;
  declare action: string;
  declare objectType: string | null;
  declare objectId: number | null;
  declare resultat: 'succes' | 'echec';
  declare details: string | null;
  declare ip: string | null;
  declare readonly createdAt: Date;
}

AuditLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    actorUserId: { type: DataTypes.INTEGER, allowNull: true },
    actorType: { type: DataTypes.ENUM('staff', 'company_user', 'system', 'webhook'), allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    objectType: { type: DataTypes.STRING(50), allowNull: true },
    objectId: { type: DataTypes.INTEGER, allowNull: true },
    resultat: { type: DataTypes.ENUM('succes', 'echec'), allowNull: false, defaultValue: 'succes' },
    details: { type: DataTypes.TEXT, allowNull: true },
    ip: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
  }
);

export default AuditLog;
