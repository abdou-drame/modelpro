import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Customer } from './Customer';
import { Opportunity } from './Opportunity';
import { User } from './User';

// Tâche commerciale, relance ou rendez-vous CRM (ROADMAP_BACKEND.md §6.4). Volontairement un
// modèle Naatalix séparé de `Appointment` (ModèlePro, couplé à Artisan/marketplace) plutôt qu'une
// extension de celui-ci : `type` distingue tâche/rappel/rendez-vous, qui partagent le même cycle
// de vie (assignation, report, annulation, réalisation) sans dupliquer trois tables quasi
// identiques.
export class CrmTask extends Model {
  declare id: number;
  declare companyId: number;
  declare type: 'tache' | 'rappel' | 'rendez_vous';
  declare titre: string;
  declare description: string | null;
  declare customerId: number | null;
  declare opportunityId: number | null;
  declare assignedToUserId: number | null;
  declare lieu: string | null;
  // Conserve la date d'origine pour garder trace d'un report sans construire un journal d'audit
  // générique (celui-ci est prévu séparément — entité AuditLog, Phase 5).
  declare dateEcheanceInitiale: Date | null;
  declare dateEcheance: Date | null;
  declare statut: 'a_faire' | 'fait' | 'reporte' | 'annule';
  declare motifReport: string | null;
  declare motifAnnulation: string | null;
  declare dateRealisation: Date | null;
  declare rappelActif: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CrmTask.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Company, key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.ENUM('tache', 'rappel', 'rendez_vous'),
      allowNull: false,
      defaultValue: 'tache',
    },
    titre: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Customer, key: 'id' },
      onDelete: 'CASCADE',
    },
    opportunityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Opportunity, key: 'id' },
      onDelete: 'CASCADE',
    },
    assignedToUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'SET NULL',
    },
    lieu: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dateEcheanceInitiale: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    dateEcheance: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('a_faire', 'fait', 'reporte', 'annule'),
      allowNull: false,
      defaultValue: 'a_faire',
    },
    motifReport: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    motifAnnulation: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    dateRealisation: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rappelActif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'crm_tasks',
    timestamps: true,
  }
);

CrmTask.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
CrmTask.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(CrmTask, { foreignKey: 'customerId', as: 'tasks' });
CrmTask.belongsTo(Opportunity, { foreignKey: 'opportunityId', as: 'opportunity' });
Opportunity.hasMany(CrmTask, { foreignKey: 'opportunityId', as: 'tasks' });
CrmTask.belongsTo(User, { foreignKey: 'assignedToUserId', as: 'assignedTo' });
User.hasMany(CrmTask, { foreignKey: 'assignedToUserId', as: 'assignedTasks' });

export default CrmTask;
