import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

// Journal des webhooks DexPay reçus (facturation des abonnements Naatalix, 2026-09-25) — même rôle
// que PaytrackEvent pour les paiements de factures : idempotence (eventId unique quand DexPay en
// fournit un) et traçabilité pour le support. `eventId` reste nullable car le guide fourni par
// l'utilisateur ne documente pas explicitement de champ d'identifiant d'événement unique dans le
// payload webhook (contrairement à PayTrack, dont le contrat prévoit `event_id`) — voir
// dexpayService.ts pour le détail de cette hypothèse.
export class DexpayEvent extends Model {
  declare id: number;
  declare eventId: string | null;
  declare event: string;
  declare companyId: number | null;
  declare payload: string;
  declare statut: 'traite' | 'ignore' | 'anomalie';
  declare message: string | null;
  declare readonly createdAt: Date;
}

DexpayEvent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    eventId: { type: DataTypes.STRING(120), allowNull: true, unique: true },
    event: { type: DataTypes.STRING(60), allowNull: false },
    companyId: { type: DataTypes.INTEGER, allowNull: true },
    payload: { type: DataTypes.TEXT, allowNull: false },
    statut: { type: DataTypes.ENUM('traite', 'ignore', 'anomalie'), allowNull: false },
    message: { type: DataTypes.STRING(500), allowNull: true },
  },
  { sequelize, tableName: 'integration_dexpay_events', timestamps: true, updatedAt: false }
);

export default DexpayEvent;
