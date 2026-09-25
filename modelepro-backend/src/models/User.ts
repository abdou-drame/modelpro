import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';


  export class User extends Model {
  declare id: number;
  declare nom: string;
  declare prenom: string;
  declare telephone: string;
  declare email: string | null;
  declare password: string;
  // 'entreprise' = compte Naatalix rattaché à une Company (voir companyId/companyRole).
  // client/artisan/admin restent les rôles ModèlePro existants, inchangés.
  // 'ataaba_staff' = personnel ATAABA du back-office (cross-entreprises, jamais rattaché à une
  // Company) — voir platformRole et middlewares/platformMiddleware.ts.
  declare role: 'client' | 'artisan' | 'admin' | 'entreprise' | 'ataaba_staff';
  declare statut: 'actif' | 'suspendu';
  declare photoUrl: string | null;
  declare fcmToken: string | null;
  // Naatalix uniquement — null pour tous les comptes ModèlePro (client/artisan/admin).
  declare companyId: number | null;
  declare companyRole: 'admin' | 'manager' | 'commercial' | 'finance' | 'stock' | 'readonly' | null;
  // Uniquement pour role = 'ataaba_staff' : superadmin (tout), support (tickets + lecture),
  // readonly (consultation seule).
  declare platformRole: 'superadmin' | 'support' | 'readonly' | null;
  // 2FA (Phase 5, cahier des charges §14 "accès réservé, journalisé"). Deux méthodes possibles,
  // `twoFactorMethod` dit laquelle est active :
  //   - 'totp' (personnel ATAABA) : `twoFactorSecret` est écrit dès `setupTwoFactor` mais
  //     `twoFactorEnabled` ne passe à true qu'après vérification d'un premier code valide
  //     (`confirmTwoFactor`) — un secret généré mais jamais confirmé ne bloque jamais la connexion.
  //   - 'email' (comptes Naatalix, tout `role = 'entreprise'`) : pas de secret permanent, un code à
  //     usage unique est généré à chaque connexion et à l'activation, son hash et son expiration
  //     vivent dans `emailOtpCodeHash`/`emailOtpExpiresAt` (jamais le code en clair).
  declare twoFactorMethod: 'totp' | 'email' | null;
  declare twoFactorSecret: string | null;
  declare twoFactorEnabled: boolean;
  declare emailOtpCodeHash: string | null;
  declare emailOtpExpiresAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('client', 'artisan', 'admin', 'entreprise', 'ataaba_staff'),
      allowNull: false,
    },
    statut: {
      type: DataTypes.ENUM('actif', 'suspendu'),
      defaultValue: 'actif',
      allowNull: false,
    },
    photoUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    fcmToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Company, key: 'id' },
      onDelete: 'SET NULL',
    },
    companyRole: {
      type: DataTypes.ENUM('admin', 'manager', 'commercial', 'finance', 'stock', 'readonly'),
      allowNull: true,
    },
    platformRole: {
      type: DataTypes.ENUM('superadmin', 'support', 'readonly'),
      allowNull: true,
    },
    twoFactorMethod: {
      type: DataTypes.ENUM('totp', 'email'),
      allowNull: true,
    },
    twoFactorSecret: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    twoFactorEnabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailOtpCodeHash: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    emailOtpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'users',
  }
);

User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(User, { foreignKey: 'companyId', as: 'membres' });