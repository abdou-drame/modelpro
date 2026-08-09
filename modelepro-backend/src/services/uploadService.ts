import cloudinary from '../config/cloudinary';

export const uploadBufferToCloudinary = (
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'image'
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `modelpro/${folder}`, resource_type: resourceType },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Échec du téléversement Cloudinary.'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
};

// Les URLs Cloudinary encodent le type de ressource et le public_id nécessaires à la
// suppression (cloudinary.uploader.destroy exige le public_id, jamais l'URL elle-même).
const CLOUDINARY_URL_PATTERN = /res\.cloudinary\.com\/[^/]+\/(image|raw|video)\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/;

export const isCloudinaryUrl = (url: string): boolean => CLOUDINARY_URL_PATTERN.test(url);

export const deleteFromCloudinary = async (url: string): Promise<void> => {
  const match = url.match(CLOUDINARY_URL_PATTERN);
  if (!match) return;

  const [, resourceType, publicId] = match;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType as 'image' | 'raw' | 'video' });
  } catch (err) {
    console.warn('Impossible de supprimer le fichier Cloudinary :', err);
  }
};
