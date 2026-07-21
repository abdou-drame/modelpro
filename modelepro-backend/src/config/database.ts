import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID) || process.env.DB_DIALECT === 'sqlite';

const sequelize = new Sequelize(
  isTestEnv ? ':memory:' : (process.env.DB_NAME || 'modelpro'),
  isTestEnv ? '' : (process.env.DB_USER || 'postgres'),
  isTestEnv ? '' : (process.env.DB_PASSWORD || ''),
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: isTestEnv ? 'sqlite' : 'postgres',
    storage: isTestEnv ? ':memory:' : undefined,
    dialectModule: isTestEnv ? require('sqlite3') : undefined,
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  }
);

// Centralisation de la clé secrète pour le projet
export const JWT_SECRET = 'CleSuperSecreteDeMonProjet2026';

export default sequelize;