import express from 'express';
import request from 'supertest';

// rateLimitMiddleware.ts se neutralise volontairement quand NODE_ENV=test/JEST_WORKER_ID (sinon
// toute la suite Jest, qui envoie des centaines de requêtes depuis la même IP, se ferait bloquer).
// Ce test contourne cette neutralisation en simulant un environnement hors-test au chargement du
// module, dans un realm Jest isolé (jest.isolateModules) pour ne pas affecter le reste de la
// suite — c'est la seule façon de vérifier que le limiteur bloque réellement au-delà du seuil.
describe('rateLimitMiddleware (limiteur anti-abus)', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalWorker = process.env.JEST_WORKER_ID;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    if (originalWorker !== undefined) process.env.JEST_WORKER_ID = originalWorker;
  });

  it('authLimiter bloque après le seuil de tentatives (429) quand il n’est pas en environnement de test', async () => {
    let authLimiter: any;
    await jest.isolateModulesAsync(async () => {
      delete process.env.JEST_WORKER_ID;
      process.env.NODE_ENV = 'production';
      ({ authLimiter } = require('../middlewares/rateLimitMiddleware'));
    });

    const app = express();
    app.get('/test', authLimiter, (_req, res) => res.status(200).json({ ok: true }));

    let lastStatus = 200;
    for (let i = 0; i < 11; i++) {
      lastStatus = (await request(app).get('/test')).status;
    }
    expect(lastStatus).toBe(429);
  });

  it('reste neutralisé (aucun 429) en environnement de test réel', async () => {
    const { authLimiter } = require('../middlewares/rateLimitMiddleware');
    const app = express();
    app.get('/test', authLimiter, (_req, res) => res.status(200).json({ ok: true }));

    for (let i = 0; i < 15; i++) {
      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
    }
  });
});
