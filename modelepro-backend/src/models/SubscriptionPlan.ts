import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

// Plan d'abonnement SaaS Naatalix (cahier des charges §13). Entièrement distinct du modèle `Pack`
// (abonnement artisan ModèlePro) — les deux produits ne partagent aucune table d'abonnement.
// Tarifs/quotas validés par la direction ATAABA le 2026-09-23 (voir JOURNAL.md) ; le découpage
// des fonctionnalités par palier (`features`) est une proposition de mapping sur les modules
// existants, ajustable depuis le back-office sans redéploiement.
export class SubscriptionPlan extends Model {
  declare id: number;
  declare code: string;
  declare nom: string;
  declare prixMensuel: number;
  declare prixAnnuel: number;
  declare maxUtilisateurs: number | null;
  declare maxSites: number | null;
  declare essaiJours: number;
  declare actif: boolean;
  // Clés de fonctionnalités débloquées par ce plan, stockées en JSON (voir
  // subscriptionService.PLAN_FEATURE_KEYS pour les valeurs possibles et
  // subscriptionMiddleware.requireFeature pour le contrôle d'accès).
  declare features: string;

  getFeatures(): string[] {
    try {
      const parsed = JSON.parse(this.features || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

SubscriptionPlan.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    nom: { type: DataTypes.STRING(80), allowNull: false },
    prixMensuel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    prixAnnuel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    // null = illimité
    maxUtilisateurs: { type: DataTypes.INTEGER, allowNull: true },
    maxSites: { type: DataTypes.INTEGER, allowNull: true },
    essaiJours: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 14 },
    actif: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    features: { type: DataTypes.TEXT, allowNull: false, defaultValue: '[]' },
  },
  { sequelize, tableName: 'saas_plans', timestamps: true }
);

export default SubscriptionPlan;
