import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Artisan } from './Artisan';
import { User } from './User';

export class Review extends Model {
  declare id: number;
  declare artisanId: number;
  declare clientId: number;
  declare note: number;
  declare noteQualite: number | null;
  declare noteDelai: number | null;
  declare noteCommunication: number | null;
  declare notePrix: number | null;
  declare noteProfessionnalisme: number | null;
  declare commentaire: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Review.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    artisanId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'artisans', key: 'id' },
      onDelete: 'CASCADE',
    },
    clientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    note: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    noteQualite: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    noteDelai: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    noteCommunication: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    notePrix: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    noteProfessionnalisme: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    commentaire: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'reviews',
  }
);

Artisan.hasMany(Review, { foreignKey: 'artisanId', as: 'reviews' });
Review.belongsTo(Artisan, { foreignKey: 'artisanId', as: 'artisan' });
User.hasMany(Review, { foreignKey: 'clientId', as: 'clientReviews' });
Review.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
