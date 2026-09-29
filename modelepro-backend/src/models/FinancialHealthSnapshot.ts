import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Historique du score de santé financière (2026-09-29, méthodologie M. Bamba — voir
// profitabilityCalculationService.computeFinancialHealthScore). Naatalix ne conserve pas
// d'historique du stock/des créances (pas de snapshot daté) : reconstruire le score pour un mois
// passé donnerait un résultat FAUX pour les postes dépendant de l'état courant du stock. Le choix
// assumé est donc de ne PAS reconstruire de fausse histoire : un instantané (score + détail) est
// enregistré à chaque calcul, un seul par mois et par entreprise (mis à jour si recalculé
// plusieurs fois dans le même mois) — l'historique se construit réellement à partir de
// maintenant, pas rétroactivement.
export class FinancialHealthSnapshot extends Model {
  declare id: number;
  declare companyId: number;
  declare mois: string; // premier jour du mois (DATEONLY), ex. '2026-09-01'
  declare score: number;
  declare details: string; // JSON.stringify(FinancialHealthDetail[])
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

FinancialHealthSnapshot.init(
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
    mois: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'crm_financial_health_snapshots',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'mois'] }],
  }
);

FinancialHealthSnapshot.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

export default FinancialHealthSnapshot;
