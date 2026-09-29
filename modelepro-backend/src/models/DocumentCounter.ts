import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';

// Compteur de numérotation par entreprise et par type de document (DEV, CMD, FAC...).
// Voir services/documentNumberingService.ts. Une seule ligne par (companyId, prefix).
export class DocumentCounter extends Model {
  declare id: number;
  declare companyId: number;
  declare prefix: string;
  declare value: number;
}

DocumentCounter.init(
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
    prefix: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    value: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    tableName: 'crm_document_counters',
    timestamps: true,
    indexes: [{ unique: true, fields: ['company_id', 'prefix'] }],
  }
);

export default DocumentCounter;
