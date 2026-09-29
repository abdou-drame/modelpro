import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

// Entreprise Naatalix (tenant). Toutes les données métier Naatalix (clients CRM, devis,
// commandes, factures, etc.) seront rattachées à une Company via companyId, isolées entre elles.
// N'affecte aucune table ModèlePro existante (artisans/orders restent mono-artisan).
export class Company extends Model {
  declare id: number;
  declare nom: string;
  declare ninea: string | null;
  declare rccm: string | null;
  declare adresse: string | null;
  declare telephone: string | null;
  declare email: string | null;
  declare logoUrl: string | null;
  // Identité documentaire (cahier des charges §12) : injectées dans les PDF générés
  // (devis/facture/bon de commande/reçu/relevé) par src/services/pdfService.ts.
  declare coordonneesPaiement: string | null;
  declare mentionsCommerciales: string | null;
  // Intégration PayTrack activable par l'admin de l'entreprise (Naatalix fonctionne sans, cahier §7).
  declare paytrackActif: boolean;
  declare statut: 'actif' | 'suspendu';
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

Company.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    nom: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    ninea: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    rccm: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    logoUrl: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    coordonneesPaiement: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mentionsCommerciales: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    paytrackActif: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    statut: {
      type: DataTypes.ENUM('actif', 'suspendu'),
      allowNull: false,
      defaultValue: 'actif',
    },
  },
  {
    sequelize,
    tableName: 'companies',
    timestamps: true,
  }
);

export default Company;
