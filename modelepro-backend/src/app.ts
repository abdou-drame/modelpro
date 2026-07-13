import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Point de terminaison de vérification de santé de l'API
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Le serveur de base ModèlePro fonctionne sans Docker.' 
  });
});

app.listen(PORT, () => {
  console.log(`[Serveur] ModèlePro démarré avec succès sur le port ${PORT}`);
});