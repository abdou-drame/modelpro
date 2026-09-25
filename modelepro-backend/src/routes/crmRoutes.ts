import { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import { enforceSubscription, requireFeature } from '../middlewares/subscriptionMiddleware';
import { PLAN_FEATURE_KEYS } from '../services/subscriptionService';
import { requireCompany, requireCompanyRole } from '../middlewares/tenantMiddleware';
import { initiatePayment, listInvoiceTransactions } from '../controllers/paytrackController';
import {
  checkDuplicate,
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
  convertToClient,
  exportCustomers,
} from '../controllers/crmCustomerController';
import {
  createContact,
  listContacts,
  updateContact,
  deleteContact,
} from '../controllers/crmContactController';
import {
  listStages,
  createStage,
  updateStage,
  deleteStage,
} from '../controllers/pipelineStageController';
import {
  createOpportunity,
  listOpportunities,
  getOpportunity,
  updateOpportunity,
  moveToStage,
  getForecast,
} from '../controllers/opportunityController';
import {
  createTask,
  listTasks,
  getTask,
  updateTask,
  assignTask,
  rescheduleTask,
  cancelTask,
  completeTask,
} from '../controllers/crmTaskController';
import {
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  exportProducts,
} from '../controllers/crmProductController';
import {
  createQuote,
  listQuotes,
  getQuote,
  updateQuote,
  addLine,
  updateLine,
  deleteLine,
  sendQuote,
  acceptQuote,
  refuseQuote,
  expireQuote,
  getQuotePdf,
  exportQuotes,
} from '../controllers/quoteController';
import {
  createOrder,
  convertQuoteToOrder,
  listOrders,
  getOrder,
  updateOrder,
  addLine as addOrderLine,
  updateLine as updateOrderLine,
  deleteLine as deleteOrderLine,
  confirmOrder,
  startPreparationOrder,
  deliverOrder,
  cancelOrder,
  getOrderPdf,
  getDeliveryNotePdf,
  exportOrders,
} from '../controllers/salesOrderController';
import {
  createInvoice,
  convertOrderToInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  addLine as addInvoiceLine,
  updateLine as updateInvoiceLine,
  deleteLine as deleteInvoiceLine,
  sendInvoice,
  cancelInvoice,
  createCreditNote,
  recordPayment,
  listPayments,
  getCustomerStatement,
  getInvoicePdf,
  getPaymentReceiptPdf,
  getCustomerStatementPdf,
  exportInvoices,
} from '../controllers/invoiceController';

const router = Router();

// Écriture réservée aux rôles qui gèrent la relation commerciale ; lecture ouverte à tout membre
// de l'entreprise (y compris 'readonly'), cf. cahier des charges F-002.
const canWrite = requireCompanyRole('admin', 'manager', 'commercial');

// Pipeline commercial (étapes, opportunités, prévision de CA) et tâches/rappels/rendez-vous
// réservés à partir du Pro (cahier NAATALIX_Formules_Fonctionnalites.docx, 2026-09-24). Avoirs
// (notes de crédit sur facture) réservés à partir du Pro également. Le reste de ce routeur
// (clients, catalogue, devis, commandes, factures) reste la gestion commerciale de base,
// disponible dès l'Essentiel et jamais gatée par fonctionnalité.
const pipelineGate = requireFeature(PLAN_FEATURE_KEYS.CRM_PIPELINE);
const avoirsGate = requireFeature(PLAN_FEATURE_KEYS.AVOIRS);

router.use(protect, requireCompany, enforceSubscription);

router.get('/customers/check-duplicate', checkDuplicate);
router.get('/customers/export', exportCustomers);
router.get('/customers', listCustomers);
router.post('/customers', canWrite, createCustomer);
router.get('/customers/:id', getCustomer);
router.put('/customers/:id', canWrite, updateCustomer);
router.patch('/customers/:id/convert', canWrite, convertToClient);

router.get('/customers/:customerId/statement', getCustomerStatement);
router.get('/customers/:customerId/statement/pdf', getCustomerStatementPdf);
router.get('/customers/:customerId/contacts', listContacts);
router.post('/customers/:customerId/contacts', canWrite, createContact);
router.put('/contacts/:id', canWrite, updateContact);
router.delete('/contacts/:id', canWrite, deleteContact);

router.get('/pipeline-stages', pipelineGate, listStages);
router.post('/pipeline-stages', pipelineGate, canWrite, createStage);
router.put('/pipeline-stages/:id', pipelineGate, canWrite, updateStage);
router.delete('/pipeline-stages/:id', pipelineGate, canWrite, deleteStage);

// /forecast avant /:id pour ne pas être capturé comme un id d'opportunité.
router.get('/opportunities/forecast', pipelineGate, getForecast);
router.get('/opportunities', pipelineGate, listOpportunities);
router.post('/opportunities', pipelineGate, canWrite, createOpportunity);
router.get('/opportunities/:id', pipelineGate, getOpportunity);
router.put('/opportunities/:id', pipelineGate, canWrite, updateOpportunity);
router.patch('/opportunities/:id/stage', pipelineGate, canWrite, moveToStage);

// Tâches / relances / rendez-vous CRM. Création et édition descriptive réservées à
// admin/manager/commercial ; assign/reschedule/cancel/complete sont contrôlées finement dans le
// contrôleur (autorisées aussi à l'assigné de la tâche, cf. canActOnTask).
router.get('/tasks', pipelineGate, listTasks);
router.post('/tasks', pipelineGate, canWrite, createTask);
router.get('/tasks/:id', pipelineGate, getTask);
router.put('/tasks/:id', pipelineGate, canWrite, updateTask);
router.patch('/tasks/:id/assign', pipelineGate, canWrite, assignTask);
router.patch('/tasks/:id/reschedule', pipelineGate, rescheduleTask);
router.patch('/tasks/:id/cancel', pipelineGate, cancelTask);
router.patch('/tasks/:id/complete', pipelineGate, completeTask);

router.get('/products/export', exportProducts);
router.get('/products', listProducts);
router.post('/products', canWrite, createProduct);
router.get('/products/:id', getProduct);
router.put('/products/:id', canWrite, updateProduct);

router.get('/quotes/export', exportQuotes);
router.get('/quotes', listQuotes);
router.post('/quotes', canWrite, createQuote);
router.get('/quotes/:id', getQuote);
router.put('/quotes/:id', canWrite, updateQuote);
router.post('/quotes/:id/lines', canWrite, addLine);
router.put('/quotes/:id/lines/:lineId', canWrite, updateLine);
router.delete('/quotes/:id/lines/:lineId', canWrite, deleteLine);
router.patch('/quotes/:id/send', canWrite, sendQuote);
router.patch('/quotes/:id/accept', canWrite, acceptQuote);
router.patch('/quotes/:id/refuse', canWrite, refuseQuote);
router.patch('/quotes/:id/expire', canWrite, expireQuote);
router.post('/quotes/:id/convert-to-order', canWrite, convertQuoteToOrder);
router.get('/quotes/:id/pdf', getQuotePdf);

router.get('/orders/export', exportOrders);
router.get('/orders', listOrders);
router.post('/orders', canWrite, createOrder);
router.get('/orders/:id', getOrder);
router.put('/orders/:id', canWrite, updateOrder);
router.post('/orders/:id/lines', canWrite, addOrderLine);
router.put('/orders/:id/lines/:lineId', canWrite, updateOrderLine);
router.delete('/orders/:id/lines/:lineId', canWrite, deleteOrderLine);
router.patch('/orders/:id/confirm', canWrite, confirmOrder);
router.patch('/orders/:id/start-preparation', canWrite, startPreparationOrder);
router.patch('/orders/:id/deliver', canWrite, deliverOrder);
router.patch('/orders/:id/cancel', canWrite, cancelOrder);
router.post('/orders/:id/convert-to-invoice', canWrite, convertOrderToInvoice);
router.get('/orders/:id/pdf', getOrderPdf);
router.get('/orders/:id/delivery-note', getDeliveryNotePdf);

router.get('/invoices/export', exportInvoices);
router.get('/invoices', listInvoices);
router.post('/invoices', canWrite, createInvoice);
router.get('/invoices/:id', getInvoice);
router.put('/invoices/:id', canWrite, updateInvoice);
router.post('/invoices/:id/lines', canWrite, addInvoiceLine);
router.put('/invoices/:id/lines/:lineId', canWrite, updateInvoiceLine);
router.delete('/invoices/:id/lines/:lineId', canWrite, deleteInvoiceLine);
router.patch('/invoices/:id/send', canWrite, sendInvoice);
router.patch('/invoices/:id/cancel', canWrite, cancelInvoice);
router.post('/invoices/:id/credit-note', avoirsGate, canWrite, createCreditNote);
router.get('/invoices/:id/payments', listPayments);
router.post('/invoices/:id/payments', canWrite, recordPayment);
router.get('/invoices/:id/pdf', getInvoicePdf);
router.post('/invoices/:id/paytrack/pay', requireCompanyRole('admin', 'manager', 'commercial', 'finance'), initiatePayment);
router.get('/invoices/:id/paytrack', listInvoiceTransactions);
router.get('/invoices/:id/payments/:paymentId/receipt', getPaymentReceiptPdf);

export default router;
