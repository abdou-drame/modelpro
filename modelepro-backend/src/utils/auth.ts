import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_MODELE_PRO_2026_ESTM';

// Chiffrer le mot de passe (Inscription)
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// Comparer les mots de passe (Connexion)
export const comparePassword = async (password: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

// Générer un Token JWT valable 7 jours
// Dans src/utils/auth.ts

export const generateToken = (userId: number, role: string): string => {
  // On force exactement la même chaîne brute que dans le middleware
  return jwt.sign(
    { id: userId, role }, 
    'CleSuperSecreteDeMonProjet2026', 
    { expiresIn: '7d' }
  );
};