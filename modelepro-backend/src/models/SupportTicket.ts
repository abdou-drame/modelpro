import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Ticket de support / incident (cahier des charges §14 "support et incidents"). Ouvert par un
// membre d'une entreprise, traité par le personnel ATAABA depuis le back-office.
export class SupportTicket extends Model {
  declare id: number;
  declare companyId: number;
  declare createdByUserId: number;
  declare sujet: string;
  declare categorie: 'question' | 'incident' | 'facturation' | 'integration' | 'autre';
  declare priorite: 'basse' | 'normale' | 'haute' | 'critique';
  declare statut: 'ouvert' | 'en_cours' | 'en_attente_client' | 'resolu' | 'ferme';
  declare assignedStaffId: number | null;
  declare resolvedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

SupportTicket.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    companyId: { type: DataTypes.INTEGER, allowNull: false, references: { model: Company, key: 'id' }, onDelete: 'CASCADE' },
    createdByUserId: { type: DataTypes.INTEGER, allowNull: false },
    sujet: { type: DataTypes.STRING(200), allowNull: false },
    categorie: { type: DataTypes.ENUM('question', 'incident', 'facturation', 'integration', 'autre'), allowNull: false, defaultValue: 'question' },
    priorite: { type: DataTypes.ENUM('basse', 'normale', 'haute', 'critique'), allowNull: false, defaultValue: 'normale' },
    statut: { type: DataTypes.ENUM('ouvert', 'en_cours', 'en_attente_client', 'resolu', 'ferme'), allowNull: false, defaultValue: 'ouvert' },
    assignedStaffId: { type: DataTypes.INTEGER, allowNull: true },
    resolvedAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: 'support_tickets', timestamps: true }
);

SupportTicket.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

export default SupportTicket;
