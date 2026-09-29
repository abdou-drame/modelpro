import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import { Company } from './Company';
import { Product } from './Product';
import { User } from './User';

// Simulation de rentabilité (Cahier_des_charges_Module_Naatalix_Rentabilite.docx). Les champs
// de résultat (coutVariableUnitaire → roiPct) sont mis en cache, recalculés uniquement par
// profitabilityService.recalculateSimulation — point d'écriture unique, jamais modifiés
// directement ailleurs (même principe que les totaux de Quote/SalesOrder/Invoice).
export class ProfitabilitySimulation extends Model {
  declare id: number;
  declare companyId: number;
  declare nom: string;
  declare nature: 'produit' | 'service' | 'projet' | 'commerce' | 'production' | 'importation' | 'transformation' | 'prestation' | 'autre';
  declare productId: number | null;
  declare secteur: string | null;
  declare devise: string;
  declare periode: 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee';
  declare dateLancement: Date | null;
  declare quantitePrevue: number;
  declare unite: string | null;

  declare prixMarcheMin: number | null;
  declare prixMarcheMoyen: number | null;
  declare prixMarcheMax: number | null;
  declare prixEnvisage: number;

  // 'marge' = taux de marge (bénéfice/coût), 'marque' = taux de marque (bénéfice/prix de vente).
  // Le cahier des charges insiste sur la distinction pour éviter les erreurs de fixation des prix.
  declare margeCibleType: 'marge' | 'marque';
  declare margeCiblePct: number;
  declare margePremiumBonusPct: number;
  declare investissementInitial: number | null;

  declare statut: 'active' | 'archivee';
  declare createdByUserId: number | null;

  // --- Résultats calculés (cache) ---
  declare coutVariableUnitaire: number;
  declare chargesFixesTotales: number;
  declare coutCompletUnitaire: number;
  declare beneficeUnitaire: number;
  declare tauxMarge: number;
  declare tauxMarque: number;
  declare coutMaximalAcceptable: number;
  declare prixPlancher: number;
  declare prixMinimumRecommande: number;
  declare prixPremium: number;
  declare seuilRentabiliteCA: number | null;
  declare seuilRentabiliteVolume: number | null;
  declare roiPct: number | null;
  declare statutRentabilite: 'vert' | 'orange' | 'rouge';

  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

ProfitabilitySimulation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Company, key: 'id' },
      onDelete: 'CASCADE',
    },
    nom: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    nature: {
      type: DataTypes.ENUM('produit', 'service', 'projet', 'commerce', 'production', 'importation', 'transformation', 'prestation', 'autre'),
      allowNull: false,
      defaultValue: 'produit',
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: Product, key: 'id' },
      onDelete: 'SET NULL',
    },
    secteur: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    devise: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'FCFA',
    },
    periode: {
      type: DataTypes.ENUM('jour', 'semaine', 'mois', 'trimestre', 'annee'),
      allowNull: false,
      defaultValue: 'mois',
    },
    dateLancement: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    quantitePrevue: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    unite: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    prixMarcheMin: { type: DataTypes.FLOAT, allowNull: true },
    prixMarcheMoyen: { type: DataTypes.FLOAT, allowNull: true },
    prixMarcheMax: { type: DataTypes.FLOAT, allowNull: true },
    prixEnvisage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    margeCibleType: {
      type: DataTypes.ENUM('marge', 'marque'),
      allowNull: false,
      defaultValue: 'marque',
    },
    margeCiblePct: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 30,
    },
    margePremiumBonusPct: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 20,
    },
    investissementInitial: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    statut: {
      type: DataTypes.ENUM('active', 'archivee'),
      allowNull: false,
      defaultValue: 'active',
    },
    createdByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'SET NULL',
    },
    coutVariableUnitaire: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    chargesFixesTotales: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    coutCompletUnitaire: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    beneficeUnitaire: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    tauxMarge: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    tauxMarque: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    coutMaximalAcceptable: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    prixPlancher: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    prixMinimumRecommande: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    prixPremium: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 0 },
    seuilRentabiliteCA: { type: DataTypes.FLOAT, allowNull: true },
    seuilRentabiliteVolume: { type: DataTypes.FLOAT, allowNull: true },
    roiPct: { type: DataTypes.FLOAT, allowNull: true },
    statutRentabilite: {
      type: DataTypes.ENUM('vert', 'orange', 'rouge'),
      allowNull: false,
      defaultValue: 'rouge',
    },
  },
  {
    sequelize,
    tableName: 'crm_profitability_simulations',
    timestamps: true,
  }
);

ProfitabilitySimulation.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
ProfitabilitySimulation.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
ProfitabilitySimulation.belongsTo(User, { foreignKey: 'createdByUserId', as: 'createdBy' });

export default ProfitabilitySimulation;
