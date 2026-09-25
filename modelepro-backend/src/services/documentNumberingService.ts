import { Transaction } from 'sequelize';
import { DocumentCounter } from '../models/DocumentCounter';

// Génère un numéro séquentiel par entreprise et par type de document (ex. "DEV-2026-0001"),
// utilisé pour les devis, puis réutilisé tel quel pour les commandes et factures en Phase 2
// (ROADMAP_BACKEND.md §7 : "numérotation par entreprise" est requis pour les trois documents).
// Doit être appelé à l'intérieur d'une transaction Sequelize passée par l'appelant : le verrou
// de ligne (`lock: transaction.LOCK.UPDATE`) évite que deux créations simultanées obtiennent le
// même numéro.
export const nextDocumentNumber = async (companyId: number, prefix: string, transaction: Transaction): Promise<string> => {
  let counter = await DocumentCounter.findOne({
    where: { companyId, prefix },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (!counter) {
    counter = await DocumentCounter.create({ companyId, prefix, value: 0 }, { transaction });
  }

  counter.value += 1;
  await counter.save({ transaction });

  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(counter.value).padStart(4, '0')}`;
};
