import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/database';

// Importation de tous les modèles pour la synchronisation PostgreSQL
import './models/User';
import './models/Client';
import './models/Artisan';
import './models/Creation';

// Importation des routes v1
import authRoutes from './routes/authRoutes';
import artisanRoutes from './routes/artisanRoutes';


dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Points de terminaison (Endpoints)s de l'application
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/artisans', artisanRoutes);

// Route de test pour la santé de l'API
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Le serveur répond et le routage est actif.' });
});

// Connexion et Synchronisation de la Base de Données
sequelize.sync({ force: false }) // force: true pour recréer les tables à chaque démarrage (utile en développement)
  .then(() => {
    console.log('[PostgreSQL] Connexion établie et tables synchronisées.');
    app.listen(PORT, () => {
      console.log(`[Serveur] API ModèlePro démarrée sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[PostgreSQL] Erreur de connexion fatale :', error);
  });