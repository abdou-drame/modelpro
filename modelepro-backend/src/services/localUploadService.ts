import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Stockage local sur le disque du VPS (alternative à Cloudinary, décision du 2026-09-24 : le
// backend est hébergé sur un VPS avec disque persistant, pas de plateforme à filesystem éphémère
// — le stockage local est donc fiable ici). Les fichiers sont servis statiquement par
// `app.use('/uploads', express.static(...))` (app.ts), déjà en place.
const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

// Extension dérivée du mimetype validé, jamais du nom de fichier fourni par le client — évite
// qu'un nom de fichier malveillant (ex. `../../x.php`) influence le chemin final ou l'extension.
const ALLOWED_MIME_EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const baseUrl = (): string => (process.env.APP_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

// Enregistre une image reçue en mémoire (buffer multer) dans uploads/<subfolder>/, sous un nom
// généré côté serveur, et retourne son URL publique absolue — utilisable telle quelle partout où
// une URL Cloudinary l'était auparavant (ex. `Company.logoUrl`, lu par pdfService.fetchLogoBuffer
// via un simple `fetch()`).
export const saveImageLocally = async (buffer: Buffer, mimetype: string, subfolder: string): Promise<string> => {
  const ext = ALLOWED_MIME_EXTENSIONS[mimetype];
  if (!ext) throw new Error('Type de fichier non autorisé. Formats acceptés : PNG, JPEG, WEBP.');

  const dir = path.join(UPLOADS_ROOT, subfolder);
  await fs.promises.mkdir(dir, { recursive: true });

  const filename = `${crypto.randomUUID()}.${ext}`;
  await fs.promises.writeFile(path.join(dir, filename), buffer);

  return `${baseUrl()}/uploads/${subfolder}/${filename}`;
};

export const isLocalUploadUrl = (url: string): boolean => url.startsWith(`${baseUrl()}/uploads/`);

// Supprime un fichier précédemment enregistré par saveImageLocally (best-effort : ne doit jamais
// faire échouer l'action appelante, même principe que deleteFromCloudinary). N'agit que sur une
// URL de notre propre dossier uploads/ — jamais sur une URL externe (ex. logo Cloudinary saisi
// manuellement) — et revalide que le chemin résolu reste bien sous UPLOADS_ROOT avant suppression
// (empêche toute traversée de chemin via un segment `..`).
export const deleteLocalFile = async (url: string): Promise<void> => {
  if (!isLocalUploadUrl(url)) return;
  const relative = url.slice(`${baseUrl()}/uploads/`.length);
  const resolved = path.normalize(path.join(UPLOADS_ROOT, relative));
  if (!resolved.startsWith(UPLOADS_ROOT)) return;

  try {
    await fs.promises.unlink(resolved);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') console.warn('Impossible de supprimer le fichier local :', err);
  }
};
