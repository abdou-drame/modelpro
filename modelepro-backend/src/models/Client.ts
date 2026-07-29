import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { User } from './User';

export class Client extends Model {
  declare id: number;
  declare userId: number;
  declare localisation: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Client.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    localisation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: 'Non renseigné',
    },
  },
  {
    sequelize,
    tableName: 'clients',
    timestamps: false,
  }
);

// Définition des relations
User.hasOne(Client, { foreignKey: 'userId', as: 'clientProfile' });
Client.belongsTo(User, { foreignKey: 'userId', as: 'user' });