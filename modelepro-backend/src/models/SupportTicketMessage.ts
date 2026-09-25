import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { SupportTicket } from './SupportTicket';

export class SupportTicketMessage extends Model {
  declare id: number;
  declare ticketId: number;
  declare authorUserId: number;
  declare authorType: 'company_user' | 'staff';
  declare message: string;
  // Note interne du personnel ATAABA : jamais renvoyée côté entreprise.
  declare interne: boolean;
  declare readonly createdAt: Date;
}

SupportTicketMessage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ticketId: { type: DataTypes.INTEGER, allowNull: false, references: { model: SupportTicket, key: 'id' }, onDelete: 'CASCADE' },
    authorUserId: { type: DataTypes.INTEGER, allowNull: false },
    authorType: { type: DataTypes.ENUM('company_user', 'staff'), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    interne: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: 'support_ticket_messages', timestamps: true, updatedAt: false }
);

SupportTicketMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', as: 'ticket' });
SupportTicket.hasMany(SupportTicketMessage, { foreignKey: 'ticketId', as: 'messages' });

export default SupportTicketMessage;
