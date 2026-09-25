import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { SubscriptionPlan } from './SubscriptionPlan';

// Abonnement courant d'une entreprise (une seule ligne par entreprise ; l'historique des
// changements est conservé dans SubscriptionEvent). Le statut affiché/appliqué se lit via
// subscriptionService.effectiveStatus (essai/période échus sans attendre le job quotidien).
export class CompanySubscription extends Model {
  declare id: number;
  declare companyId: number;
  declare planId: number;
  declare statut: 'essai' | 'actif' | 'suspendu' | 'expire' | 'annule';
  declare cycle: 'mensuel' | 'annuel';
  declare dateDebut: Date;
  declare dateFinEssai: Date | null;
  declare dateFinPeriode: Date | null;
  declare motifSuspension: string | null;
  declare alerteExpirationEnvoyee: boolean;
  // Facturation DexPay (2026-09-25) — liens vers le customer/subscription créés côté DexPay pour
  // cette entreprise. Renseignés à la création de l'abonnement DexPay (dexpayService.ts),
  // retrouvés par le webhook pour appliquer les événements (paiement réussi/échoué, annulation) à
  // la bonne entreprise.
  declare dexpayCustomerId: string | null;
  declare dexpaySubscriptionId: string | null;
  // Corrélation du webhook `checkout.completed` (2026-09-25, vérifié contre le vrai sandbox) : ce
  // type d'événement n'a NI subscription_id NI les metadata passées à la création (DexPay renvoie
  // les siennes, ex. merchant_id) — seul `data.payment.checkout_session_id` de la réponse de
  // POST /subscriptions correspond au `checkout_session_id` reçu dans ce webhook précis. Les
  // renouvellements ultérieurs (`subscription.payment.succeeded` d'après le guide) sont, eux,
  // censés porter `subscription_id` — non encore vérifié en conditions réelles.
  declare dexpayCheckoutSessionId: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

CompanySubscription.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      references: { model: Company, key: 'id' },
      onDelete: 'CASCADE',
    },
    planId: { type: DataTypes.INTEGER, allowNull: false, references: { model: SubscriptionPlan, key: 'id' } },
    statut: { type: DataTypes.ENUM('essai', 'actif', 'suspendu', 'expire', 'annule'), allowNull: false, defaultValue: 'essai' },
    cycle: { type: DataTypes.ENUM('mensuel', 'annuel'), allowNull: false, defaultValue: 'mensuel' },
    dateDebut: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    dateFinEssai: { type: DataTypes.DATE, allowNull: true },
    dateFinPeriode: { type: DataTypes.DATE, allowNull: true },
    motifSuspension: { type: DataTypes.TEXT, allowNull: true },
    alerteExpirationEnvoyee: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    dexpayCustomerId: { type: DataTypes.STRING(120), allowNull: true },
    dexpaySubscriptionId: { type: DataTypes.STRING(120), allowNull: true },
    dexpayCheckoutSessionId: { type: DataTypes.STRING(120), allowNull: true },
  },
  { sequelize, tableName: 'saas_subscriptions', timestamps: true }
);

CompanySubscription.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasOne(CompanySubscription, { foreignKey: 'companyId', as: 'subscription' });
CompanySubscription.belongsTo(SubscriptionPlan, { foreignKey: 'planId', as: 'plan' });

export default CompanySubscription;
