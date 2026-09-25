import { Company } from '../models/Company';
import { Quote } from '../models/Quote';
import { QuoteLine } from '../models/QuoteLine';
import { SalesOrder } from '../models/SalesOrder';
import { SalesOrderLine } from '../models/SalesOrderLine';
import { Invoice } from '../models/Invoice';
import { InvoiceLine } from '../models/InvoiceLine';
import { InvoicePayment } from '../models/InvoicePayment';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { PurchaseOrderLine } from '../models/PurchaseOrderLine';
import { Customer } from '../models/Customer';
import { Supplier } from '../models/Supplier';
import {
  createPdfDocument,
  drawHeader,
  drawRecipientBlock,
  drawLinesTable,
  drawTotalsBlock,
  drawFooter,
  formatMontant,
  formatDate,
  PdfLine,
} from './pdfService';

const toPdfLines = (lines: Array<{ designation: string; quantite: number; prixUnitaire: number; remisePct: number; tauxTaxe: number }>): PdfLine[] =>
  lines.map((l) => {
    const brut = l.quantite * l.prixUnitaire;
    const totalLigneHT = brut - brut * (l.remisePct / 100);
    return { designation: l.designation, quantite: l.quantite, prixUnitaire: l.prixUnitaire, remisePct: l.remisePct, tauxTaxe: l.tauxTaxe, totalLigneHT };
  });

const STATUT_LABELS: Record<string, string> = {
  brouillon: 'Brouillon', envoye: 'Envoyé', envoyee: 'Envoyée', accepte: 'Accepté', refuse: 'Refusé', expire: 'Expiré',
  confirmee: 'Confirmée', en_preparation: 'En préparation', livree: 'Livrée', annulee: 'Annulée', recue: 'Reçue',
  impayee: 'Impayée', partiellement_payee: 'Partiellement payée', payee: 'Payée',
};

// GET /crm/quotes/:id/pdf
export const generateQuotePdf = async (quote: Quote, lines: QuoteLine[], customer: Customer, company: Company): Promise<Buffer> => {
  const { doc, done } = createPdfDocument();
  let y = await drawHeader(doc, company, 'DEVIS', quote.numero, 'Date d\'émission', quote.createdAt);
  y = drawRecipientBlock(doc, y, 'Client', { nom: customer.nom, adresse: customer.adresse, telephone: customer.telephone, email: customer.email });

  doc.fontSize(9).font('Helvetica').text(`Statut : ${STATUT_LABELS[quote.statut] || quote.statut}`, 40, y);
  if (quote.dateValidite) doc.text(`Valable jusqu'au : ${formatDate(quote.dateValidite)}`, 40, y + 12);
  y += 30;

  y = drawLinesTable(doc, y, toPdfLines(lines), 'FCFA');
  y = drawTotalsBlock(doc, y, {
    sousTotal: quote.sousTotal, remiseGlobale: quote.remiseGlobale, totalTaxes: quote.totalTaxes, totalTTC: quote.totalTTC,
  }, 'FCFA');

  if (quote.notes) doc.fontSize(8).font('Helvetica').text(`Notes : ${quote.notes}`, 40, y + 10, { width: 500 });

  drawFooter(doc, company);
  doc.end();
  return done;
};

// GET /crm/orders/:id/pdf (bon de commande) et /delivery-note (bon de livraison)
export const generateSalesOrderPdf = async (
  order: SalesOrder,
  lines: SalesOrderLine[],
  customer: Customer,
  company: Company,
  mode: 'commande' | 'livraison'
): Promise<Buffer> => {
  const { doc, done } = createPdfDocument();
  const titre = mode === 'livraison' ? 'BON DE LIVRAISON' : 'BON DE COMMANDE';
  let y = await drawHeader(doc, company, titre, order.numero, 'Date de commande', order.dateCommande);
  y = drawRecipientBlock(doc, y, 'Client', { nom: customer.nom, adresse: customer.adresse, telephone: customer.telephone, email: customer.email });

  doc.fontSize(9).font('Helvetica').text(`Statut : ${STATUT_LABELS[order.statut] || order.statut}`, 40, y);
  if (order.dateLivraisonPrevue) doc.text(`Livraison prévue le : ${formatDate(order.dateLivraisonPrevue)}`, 40, y + 12);
  y += 30;

  y = drawLinesTable(doc, y, toPdfLines(lines), 'FCFA');
  if (mode === 'commande') {
    y = drawTotalsBlock(doc, y, {
      sousTotal: order.sousTotal, remiseGlobale: order.remiseGlobale, totalTaxes: order.totalTaxes, totalTTC: order.totalTTC,
    }, 'FCFA');
  } else {
    doc.fontSize(8).font('Helvetica').text('Bon de livraison — quantités à vérifier et signer à réception.', 40, y);
    y += 30;
    doc.text('Signature client : ______________________', 40, y);
  }

  drawFooter(doc, company);
  doc.end();
  return done;
};

// GET /crm/invoices/:id/pdf (facture ou avoir)
export const generateInvoicePdf = async (invoice: Invoice, lines: InvoiceLine[], customer: Customer, company: Company): Promise<Buffer> => {
  const { doc, done } = createPdfDocument();
  const titre = invoice.type === 'avoir' ? 'AVOIR' : 'FACTURE';
  let y = await drawHeader(doc, company, titre, invoice.numero, 'Date d\'émission', invoice.dateEmission);
  y = drawRecipientBlock(doc, y, 'Client', { nom: customer.nom, adresse: customer.adresse, telephone: customer.telephone, email: customer.email });

  doc.fontSize(9).font('Helvetica').text(`Statut de paiement : ${STATUT_LABELS[invoice.paymentStatus] || invoice.paymentStatus}`, 40, y);
  if (invoice.dateEcheance) doc.text(`Échéance : ${formatDate(invoice.dateEcheance)}`, 40, y + 12);
  y += 30;

  y = drawLinesTable(doc, y, toPdfLines(lines), 'FCFA');
  y = drawTotalsBlock(doc, y, {
    sousTotal: invoice.sousTotal, remiseGlobale: invoice.remiseGlobale, totalTaxes: invoice.totalTaxes, totalTTC: invoice.totalTTC,
    montantPaye: invoice.montantPaye, soldeRestant: invoice.soldeRestant,
  }, 'FCFA');

  if (invoice.notes) doc.fontSize(8).font('Helvetica').text(`Notes : ${invoice.notes}`, 40, y + 10, { width: 500 });

  drawFooter(doc, company);
  doc.end();
  return done;
};

// GET /crm/invoices/:id/payments/:paymentId/receipt
export const generateReceiptPdf = async (payment: InvoicePayment, invoice: Invoice, customer: Customer, company: Company): Promise<Buffer> => {
  const { doc, done } = createPdfDocument();
  let y = await drawHeader(doc, company, 'REÇU DE PAIEMENT', `${invoice.numero}-R${payment.id}`, 'Date du règlement', payment.datePaiement);
  y = drawRecipientBlock(doc, y, 'Client', { nom: customer.nom });

  doc.fontSize(11).font('Helvetica-Bold').text(`Montant reçu : ${formatMontant(payment.montant, 'FCFA')}`, 40, y);
  y += 24;
  doc.fontSize(9).font('Helvetica');
  doc.text(`Moyen de paiement : ${payment.moyen}`, 40, y); y += 14;
  if (payment.reference) { doc.text(`Référence : ${payment.reference}`, 40, y); y += 14; }
  doc.text(`Facture concernée : ${invoice.numero}`, 40, y); y += 14;
  doc.text(`Total facture : ${formatMontant(invoice.totalTTC, 'FCFA')}`, 40, y); y += 14;
  doc.text(`Solde restant après ce règlement : ${formatMontant(invoice.soldeRestant, 'FCFA')}`, 40, y); y += 14;
  if (payment.notes) { doc.text(`Notes : ${payment.notes}`, 40, y); y += 14; }

  drawFooter(doc, company);
  doc.end();
  return done;
};

// GET /crm/purchase-orders/:id/pdf (bon de commande fournisseur)
export const generatePurchaseOrderPdf = async (
  order: PurchaseOrder,
  lines: PurchaseOrderLine[],
  supplier: Supplier,
  company: Company
): Promise<Buffer> => {
  const { doc, done } = createPdfDocument();
  let y = await drawHeader(doc, company, 'BON DE COMMANDE FOURNISSEUR', order.numero, 'Date de commande', order.dateCommande);
  y = drawRecipientBlock(doc, y, 'Fournisseur', { nom: supplier.nom, adresse: supplier.adresse, telephone: supplier.telephone, email: supplier.email });

  doc.fontSize(9).font('Helvetica').text(`Statut : ${STATUT_LABELS[order.statut] || order.statut}`, 40, y);
  if (order.dateEcheance) doc.text(`Échéance : ${formatDate(order.dateEcheance)}`, 40, y + 12);
  y += 30;

  y = drawLinesTable(doc, y, toPdfLines(lines), 'FCFA');
  drawTotalsBlock(doc, y, {
    sousTotal: order.sousTotal, remiseGlobale: order.remiseGlobale, totalTaxes: order.totalTaxes, totalTTC: order.totalTTC,
    montantPaye: order.montantPaye, soldeRestant: order.soldeRestant,
  }, 'FCFA');

  drawFooter(doc, company);
  doc.end();
  return done;
};

// GET /crm/customers/:customerId/statement/pdf (relevé client)
export const generateCustomerStatementPdf = async (
  statement: { customer: { id: number; nom: string }; totalFacture: number; totalAvoir: number; totalPaye: number; soldeDu: number; documents: Invoice[] },
  company: Company
): Promise<Buffer> => {
  const { doc, done } = createPdfDocument();
  let y = await drawHeader(doc, company, 'RELEVÉ CLIENT', statement.customer.nom, 'Édité le', new Date());

  doc.fontSize(9).font('Helvetica-Bold');
  doc.text('N° document', 40, y, { width: 100 });
  doc.text('Type', 145, y, { width: 60 });
  doc.text('Date', 210, y, { width: 70 });
  doc.text('Statut', 285, y, { width: 90 });
  doc.text('Montant TTC', 460, y, { width: 95, align: 'right' });
  y += 12;
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#000000').stroke();
  y += 6;

  doc.font('Helvetica').fontSize(8);
  for (const document of statement.documents) {
    doc.text(document.numero, 40, y, { width: 100 });
    doc.text(document.type === 'avoir' ? 'Avoir' : 'Facture', 145, y, { width: 60 });
    doc.text(formatDate(document.dateEmission), 210, y, { width: 70 });
    doc.text(STATUT_LABELS[document.paymentStatus] || document.paymentStatus, 285, y, { width: 90 });
    doc.text(formatMontant(document.totalTTC, 'FCFA'), 460, y, { width: 95, align: 'right' });
    y += 14;
  }
  y += 10;
  doc.moveTo(40, y).lineTo(555, y).strokeColor('#cccccc').stroke();
  y += 10;

  const devise = 'FCFA';
  doc.fontSize(9).font('Helvetica');
  doc.text('Total facturé', 350, y, { width: 110 }); doc.text(formatMontant(statement.totalFacture, devise), 460, y, { width: 95, align: 'right' }); y += 14;
  doc.text('Total avoirs', 350, y, { width: 110 }); doc.text(`- ${formatMontant(statement.totalAvoir, devise)}`, 460, y, { width: 95, align: 'right' }); y += 14;
  doc.text('Total réglé', 350, y, { width: 110 }); doc.text(`- ${formatMontant(statement.totalPaye, devise)}`, 460, y, { width: 95, align: 'right' }); y += 14;
  doc.font('Helvetica-Bold');
  doc.text('Solde dû', 350, y, { width: 110 }); doc.text(formatMontant(statement.soldeDu, devise), 460, y, { width: 95, align: 'right' });

  drawFooter(doc, company);
  doc.end();
  return done;
};
