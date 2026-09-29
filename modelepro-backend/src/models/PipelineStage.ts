import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Étape configurable du pipeline commercial (cahier des charges M03 : "étapes configurables").
// Chaque entreprise a ses propres étapes, créées par défaut à l'inscription (voir
// companyController.registerCompany) puis personnalisables (CRUD sur /crm/pipeline-stages).
export class PipelineStage extends Model {
  declare id: number;
  declare companyId: number;
  declare nom: string;
  declare ordre: number;
  // Étape terminale : une opportunité qui y entre est automatiquement marquée gagnée/perdue
  // (voir opportunityController.moveToStage). Une étape ne devrait pas être les deux à la fois.
  declare estGagne: boolean;
  declare estPerdu: boolean;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

PipelineStage.init(
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
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ordre: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    estGagne: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    estPerdu: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'crm_pipeline_stages',
    timestamps: true,
  }
);

PipelineStage.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(PipelineStage, { foreignKey: 'companyId', as: 'pipelineStages' });

export default PipelineStage;
