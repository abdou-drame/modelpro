import rateLimit from 'express-rate-limit';

// Même détection d'environnement de test que config/database.ts (bascule SQLite/Postgres) : la
// suite Jest envoie des centaines de requêtes depuis la même IP en quelques secondes — un usage
// de test légitime, pas un abus — donc les limiteurs sont neutralisés dans cet environnement.
const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
const noop = (_req: any, _res: any, next: any) => next();

// Anti brute-force sur les endpoints d'authentification (login, inscription, vérification 2FA) :
// 10 tentatives / 15 min / IP — Phase 5 (durcissement sécurité, cahier des charges §15).
export const authLimiter = isTestEnv ? noop : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
});

// Garde-fou global anti-abus sur l'ensemble de l'API : 300 requêtes / 15 min / IP.
export const apiLimiter = isTestEnv ? noop : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez plus tard.' },
});
