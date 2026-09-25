import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { PurchaseOrder } from './PurchaseOrder';
import { User } from './User';

// Règlement manuel fait AU fournisseur — même structure qu'InvoicePayment (règlement reçu du
// client), miroir côté achats.
export class PurchaseOrderPayment extends Model {
  declare id: number;
  declare companyId: number;
  declare purchaseOrderId: number;
  declare montant: number;
  declare datePaiement: Date;
  declare moyen: 'especes' | 'virement' | 'cheque' | 'mobile_money' | 'autre';
  declare reference: string | null;
  declare notes: string | null;
  declare createdByUserId: number | null;
  declare readonly createdAt: Date;
}

PurchaseOrderPayment.init(
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
    purchaseOrderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: PurchaseOrder, key: 'id' },
      onDelete: 'CASCADE',
    },
    montant: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    datePaiement: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    moyen: {
      type: DataTypes.ENUM('especes', 'virement', 'cheque', 'mobile_money', 'autre'),
      allowNull: false,
      defaultValue: 'especes',
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'SET NULL',
    },
  },
  {
    sequelize,
    tableName: 'crm_purchase_order_payments',
    timestamps: true,
    updatedAt: false,
  }
);

PurchaseOrderPayment.belongsTo(PurchaseOrder, { foreignKey: 'purchaseOrderId', as: 'purchaseOrder' });
PurchaseOrder.hasMany(PurchaseOrderPayment, { foreignKey: 'purchaseOrderId', as: 'paiements' });

export default PurchaseOrderPayment;
