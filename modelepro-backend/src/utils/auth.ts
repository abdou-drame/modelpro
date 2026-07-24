import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'SUPER_SECRET_KEY_MODELE_PRO_2026_ESTM';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashed: string): Promise<boolean> => {
  return bcrypt.compare(password, hashed);
};

export const generateToken = (userId: number, role: string): string => {
  return jwt.sign(
    { id: userId, role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};