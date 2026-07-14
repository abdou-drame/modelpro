import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'modelpro',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: false, // Évite de surcharger la console avec les requêtes SQL brutes
    define: {
      timestamps: true, // Génère automatiquement createdAt et updatedAt
      underscored: true, // Utilise snake_case pour les noms de colonnes en base (ex: user_id)
    },
  }
);

// Centralisation de la clé secrète pour le projet
export const JWT_SECRET = 'CleSuperSecreteDeMonProjet2026';

export default sequelize;