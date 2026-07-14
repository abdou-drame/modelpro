import app from './app';
import sequelize from './config/database';

const PORT = process.env.PORT || 5000;

sequelize.sync({ force: false })
  .then(() => {
    console.log('[PostgreSQL] Connexion établie et tables synchronisées.');
    app.listen(PORT, () => {
      console.log(`[Serveur] API ModèlePro démarrée sur http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('[PostgreSQL] Erreur de connexion fatale :', error);
  });
