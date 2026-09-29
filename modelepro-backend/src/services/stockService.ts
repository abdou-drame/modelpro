import { Transaction } from 'sequelize';
import { StockItem } from '../models/StockItem';
import { StockMovement } from '../models/StockMovement';

export class StockNegativeError extends Error {
  constructor(public currentQuantity: number, public requestedDelta: number) {
    super(
      `Stock insuffisant : quantité actuelle ${currentQuantity}, mouvement demandé ${requestedDelta} ` +
      `entraînerait un stock négatif. Utilisez forcerStockNegatif (réservé au rôle admin) pour l'autoriser explicitement.`
    );
    this.name = 'StockNegativeError';
  }
}

interface ApplyStockMovementParams {
  companyId: number;
  productId: number;
  siteId: number;
  type: 'entree' | 'sortie' | 'ajustement' | 'inventaire';
  // Delta signé réellement appliqué (positif = augmente le stock, négatif = le diminue).
  delta: number;
  coutUnitaire?: number | null;
  motif?: string | null;
  purchaseOrderId?: number | null;
  salesOrderId?: number | null;
  createdByUserId?: number | null;
  forcerStockNegatif?: boolean;
}

// Point d'écriture unique du stock (ROADMAP_BACKEND.md §7.5) : verrouille la ligne StockItem,
// vérifie qu'aucune sortie/ajustement ne crée un stock négatif sans permission explicite (critère
// principal), met à jour le coût moyen pondéré sur les entrées à coût connu, puis journalise le
// mouvement. Doit être appelé à l'intérieur d'une transaction fournie par l'appelant.
export const applyStockMovement = async (
  params: ApplyStockMovementParams,
  transaction: Transaction
): Promise<{ item: StockItem; movement: StockMovement }> => {
  const { companyId, productId, siteId, type, delta, coutUnitaire, motif, purchaseOrderId, salesOrderId, createdByUserId, forcerStockNegatif } = params;

  let item = await StockItem.findOne({
    where: { companyId, productId, siteId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!item) {
    item = await StockItem.create({ companyId, productId, siteId, quantite: 0, coutMoyenPondere: 0 }, { transaction });
  }

  const newQuantite = item.quantite + delta;
  if (newQuantite < 0 && !forcerStockNegatif) {
    throw new StockNegativeError(item.quantite, delta);
  }

  if (delta > 0 && coutUnitaire !== undefined && coutUnitaire !== null && newQuantite > 0) {
    const valeurAvant = item.quantite * item.coutMoyenPondere;
    const valeurEntree = delta * coutUnitaire;
    item.coutMoyenPondere = (valeurAvant + valeurEntree) / newQuantite;
  }
  item.quantite = newQuantite;
  await item.save({ transaction });

  const movement = await StockMovement.create({
    companyId,
    productId,
    siteId,
    type,
    quantite: delta,
    coutUnitaire: coutUnitaire ?? null,
    motif: motif || null,
    purchaseOrderId: purchaseOrderId || null,
    salesOrderId: salesOrderId || null,
    createdByUserId: createdByUserId || null,
  }, { transaction });

  return { item, movement };
};
