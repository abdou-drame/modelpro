import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Importation de tous les modèles pour la synchronisation PostgreSQL / tests
import './models/User';
import './models/Client';
import './models/Artisan';
import './models/Creation';
import './models/Appointment';
import './models/Order';
import './models/Review';

// Importation des routes v1
import authRoutes from './routes/authRoutes';
import artisanRoutes from './routes/artisanRoutes';
import modelRoutes from './routes/modelRoutes';

dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());

// Points de terminaison (Endpoints)s de l'application
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/artisans', artisanRoutes);
app.use('/api/v1/models', modelRoutes);

// Route de test pour la santé de l'API
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', message: 'Le serveur répond et le routage est actif.' });
});

export default app;