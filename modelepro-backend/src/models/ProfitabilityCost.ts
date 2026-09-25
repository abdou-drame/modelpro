import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { ProfitabilitySimulation } from './ProfitabilitySimulation';

// Ligne de coût d'une simulation de rentabilité. Convention fixée pour coller à l'exemple
// chiffré du cahier des charges (§41) : un coût 'variable' est saisi en valeur PAR UNITÉ
// (contribue directement au coût variable unitaire), un coût 'fixe' est saisi en TOTAL SUR LA
// PÉRIODE (contribue aux charges fixes totales, réparties ensuite sur quantitePrevue).
export class ProfitabilityCost extends Model {
  declare id: number;
  declare simulationId: number;
  declare categorie: 'achat_production' | 'transport_logistique' | 'frais_paiement' | 'marketing' | 'rh_fiscal' | 'autre';
  declare libelle: string;
  declare montant: number;
  declare type: 'fixe' | 'variable';
}

ProfitabilityCost.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    simulationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: ProfitabilitySimulation, key: 'id' },
      onDelete: 'CASCADE',
    },
    categorie: {
      type: DataTypes.ENUM('achat_production', 'transport_logistique', 'frais_paiement', 'marketing', 'rh_fiscal', 'autre'),
      allowNull: false,
      defaultValue: 'autre',
    },
    libelle: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.ENUM('fixe', 'variable'),
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'crm_profitability_costs',
    timestamps: true,
  }
);

ProfitabilityCost.belongsTo(ProfitabilitySimulation, { foreignKey: 'simulationId', as: 'simulation' });
ProfitabilitySimulation.hasMany(ProfitabilityCost, { foreignKey: 'simulationId', as: 'couts' });

export default ProfitabilityCost;
