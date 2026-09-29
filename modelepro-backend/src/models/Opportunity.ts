import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Customer } from './Customer';
import { User } from './User';
import { PipelineStage } from './PipelineStage';

// Opportunité commerciale CRM (cahier des charges M03, ROADMAP_BACKEND.md §6.3).
export class Opportunity extends Model {
  declare id: number;
  declare companyId: number;
  declare customerId: number;
  declare stageId: number;
  declare nom: string;
  declare valeur: number;
  declare probabilite: number;
  declare assignedToUserId: number | null;
  declare prochaineAction: string | null;
  declare dateProchaineAction: Date | null;
  declare notes: string | null;
  // Dérivé du flag estGagne/estPerdu de l'étape courante, maintenu par
  // opportunityController.moveToStage à chaque changement d'étape (source de vérité unique :
  // le contrôleur, pas de recalcul dispersé ailleurs) — permet un filtrage direct sans jointure.
  declare statut: 'ouverte' | 'gagnee' | 'perdue';
  declare dateCloture: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Opportunity.init(
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
    customerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Customer, key: 'id' },
      onDelete: 'CASCADE',
    },
    stageId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: PipelineStage, key: 'id' },
    },
    nom: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    valeur: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    probabilite: {
      // Pourcentage 0-100, validé côté contrôleur.
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    assignedToUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'SET NULL',
    },
    prochaineAction: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dateProchaineAction: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('ouverte', 'gagnee', 'perdue'),
      allowNull: false,
      defaultValue: 'ouverte',
    },
    dateCloture: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'crm_opportunities',
    timestamps: true,
  }
);

Opportunity.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Opportunity.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });
Customer.hasMany(Opportunity, { foreignKey: 'customerId', as: 'opportunities' });
Opportunity.belongsTo(PipelineStage, { foreignKey: 'stageId', as: 'stage' });
PipelineStage.hasMany(Opportunity, { foreignKey: 'stageId', as: 'opportunities' });
Opportunity.belongsTo(User, { foreignKey: 'assignedToUserId', as: 'assignedTo' });
User.hasMany(Opportunity, { foreignKey: 'assignedToUserId', as: 'assignedOpportunities' });

export default Opportunity;
