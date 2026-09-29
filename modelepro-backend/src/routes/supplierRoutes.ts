import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { enforceSubscription } from '../middlewares/subscriptionMiddleware';
import { requireCompany, requireCompanyRole } from '../middlewares/tenantMiddleware';
import {
  createSupplier,
  listSuppliers,
  getSupplier,
  updateSupplier,
  getSupplierStatement,
  createSupplierContact,
  listSupplierContacts,
  updateSupplierContact,
  deleteSupplierContact,
  linkSupplierProduct,
  listSupplierProducts,
  updateSupplierProduct,
  deleteSupplierProduct,
  exportSuppliers,
} from '../controllers/supplierController';
import {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  addLine,
  updateLine,
  deleteLine,
  sendPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  recordPayment,
  listPayments,
  getPurchaseOrderPdf,
  exportPurchaseOrders,
} from '../controllers/purchaseOrderController';

const router = Router();

// Écriture réservée aux rôles qui gèrent les achats ; lecture ouverte à tout membre de
// l'entreprise (y compris 'readonly'/'finance'), même règle que le reste du CRM/ERP.
const canWrite = requireCompanyRole('admin', 'manager', 'stock');

// Fournisseurs/achats de base : disponible dès l'Essentiel (cahier NAATALIX_Formules_
// Fonctionnalites.docx, 2026-09-24 — "Fournisseurs & achats" est coché sur les 3 formules, plus
// de gate de fonctionnalité ici). Le tableau `gate` (auth/tenant/abonnement) est néanmoins
// conservé route par route (PAS via router.use) : ce routeur est monté sur le même préfixe
// /api/v1/crm que crmRoutes et stockRoutes — un router.use() ici s'exécuterait aussi, via le
// fallthrough Express, pour des requêtes destinées à ces AUTRES routeurs (ex. /crm/sites).
const gate = [protect, requireCompany, enforceSubscription];

router.get('/suppliers/export', ...gate, exportSuppliers);
router.get('/suppliers', ...gate, listSuppliers);
router.post('/suppliers', ...gate, canWrite, createSupplier);
router.get('/suppliers/:id', ...gate, getSupplier);
router.put('/suppliers/:id', ...gate, canWrite, updateSupplier);
router.get('/suppliers/:id/statement', ...gate, getSupplierStatement);

router.get('/suppliers/:supplierId/contacts', ...gate, listSupplierContacts);
router.post('/suppliers/:supplierId/contacts', ...gate, canWrite, createSupplierContact);
router.put('/supplier-contacts/:id', ...gate, canWrite, updateSupplierContact);
router.delete('/supplier-contacts/:id', ...gate, canWrite, deleteSupplierContact);

router.get('/suppliers/:supplierId/products', ...gate, listSupplierProducts);
router.post('/suppliers/:supplierId/products', ...gate, canWrite, linkSupplierProduct);
router.put('/supplier-products/:id', ...gate, canWrite, updateSupplierProduct);
router.delete('/supplier-products/:id', ...gate, canWrite, deleteSupplierProduct);

router.get('/purchase-orders/export', ...gate, exportPurchaseOrders);
router.get('/purchase-orders', ...gate, listPurchaseOrders);
router.post('/purchase-orders', ...gate, canWrite, createPurchaseOrder);
router.get('/purchase-orders/:id', ...gate, getPurchaseOrder);
router.put('/purchase-orders/:id', ...gate, canWrite, updatePurchaseOrder);
router.post('/purchase-orders/:id/lines', ...gate, canWrite, addLine);
router.put('/purchase-orders/:id/lines/:lineId', ...gate, canWrite, updateLine);
router.delete('/purchase-orders/:id/lines/:lineId', ...gate, canWrite, deleteLine);
router.patch('/purchase-orders/:id/send', ...gate, canWrite, sendPurchaseOrder);
router.patch('/purchase-orders/:id/confirm', ...gate, canWrite, confirmPurchaseOrder);
router.patch('/purchase-orders/:id/receive', ...gate, canWrite, receivePurchaseOrder);
router.patch('/purchase-orders/:id/cancel', ...gate, canWrite, cancelPurchaseOrder);
router.get('/purchase-orders/:id/payments', ...gate, listPayments);
router.post('/purchase-orders/:id/payments', ...gate, canWrite, recordPayment);
router.get('/purchase-orders/:id/pdf', ...gate, getPurchaseOrderPdf);

export default router;
