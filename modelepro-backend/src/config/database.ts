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

// Source unique du secret JWT (authMiddleware.ts et utils/auth.ts l'importent d'ici, ne pas
// redéclarer de fallback ailleurs). En dehors des tests, JWT_SECRET doit venir de l'environnement :
// un secret par défaut codé en dur permettrait de forger un token admin valide.
export const JWT_SECRET: string = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (isTestEnv) return 'TEST_ONLY_JWT_SECRET_DO_NOT_USE_IN_PRODUCTION';
  throw new Error(
    "JWT_SECRET manquant. Définissez la variable d'environnement JWT_SECRET avant de démarrer le serveur."
  );
})();

export default sequelize;