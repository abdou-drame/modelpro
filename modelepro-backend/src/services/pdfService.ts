import PDFDocument from 'pdfkit';
import { Company } from '../models/Company';

// Service PDF partagé (ROADMAP_BACKEND.md §7.6, cahier des charges §12) — construit une fois que
// tous les documents ERP (devis, commande, facture, bon de commande fournisseur, reçu, relevé
// client) sont modélisés, plutôt qu'un rendu ad hoc par document comme cela avait été différé à
// chaque étape précédente. Fournit des primitives de dessin réutilisées par un générateur par
// type de document (en bas de ce fichier).

const PAGE_MARGIN = 40;
const PAGE_WIDTH = 595.28; // A4 portrait, points

const formatMontant = (n: number | null | undefined, devise = 'FCFA'): string => {
  const value = Math.round(n || 0);
  return `${value.toLocaleString('fr-FR')} ${devise}`;
};

const formatDate = (d: Date | string | null | undefined): string => {
  if (!d) return '-';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};

// Récupère le logo (URL Cloudinary) en mémoire pour l'embarquer dans le PDF — échec silencieux
// (logo simplement omis) : un logo indisponible ne doit jamais empêcher la génération du document.
const fetchLogoBuffer = async (url: string | null): Promise<Buffer | null> => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
};

export const createPdfDocument = (): { doc: PDFKit.PDFDocument; done: Promise<Buffer> } => {
  const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4' });
  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
  return { doc, done };
};

// En-tête commun : logo + identité de l'entreprise (critère principal "logo, identité et
// mentions de l'entreprise sont injectés"), puis titre/numéro/date du document.
export const drawHeader = async (
  doc: PDFKit.PDFDocument,
  company: Company,
  titre: string,
  numero: string,
  dateLabel: string,
  dateValue: Date | string | null
): Promise<number> => {
  let y = PAGE_MARGIN;
  const logoBuffer = await fetchLogoBuffer(company.logoUrl);
  if (logoBuffer) {
    try { doc.image(logoBuffer, PAGE_MARGIN, y, { width: 70, height: 70, fit: [70, 70] }); } catch { /* logo corrompu : ignoré */ }
  }

  const identityX = PAGE_WIDTH - PAGE_MARGIN - 220;
  doc.fontSize(12).font('Helvetica-Bold').text(company.nom, identityX, y, { width: 220, align: 'right' });
  doc.font('Helvetica').fontSize(8);
  let identityY = y + 16;
  const identityLines = [
    company.adresse,
    company.telephone ? `Tél : ${company.telephone}` : null,
    company.email,
    company.ninea ? `NINEA : ${company.ninea}` : null,
    company.rccm ? `RCCM : ${company.rccm}` : null,
  ].filter(Boolean) as string[];
  for (const line of identityLines) {
    doc.text(line, identityX, identityY, { width: 220, align: 'right' });
    identityY += 11;
  }

  y = Math.max(y + 80, identityY + 10);
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor('#cccccc').stroke();
  y += 15;

  doc.fillColor('#000000').fontSize(16).font('Helvetica-Bold').text(titre, PAGE_MARGIN, y);
  doc.fontSize(10).font('Helvetica').text(`N° ${numero}`, PAGE_MARGIN, y + 22);
  doc.text(`${dateLabel} : ${formatDate(dateValue)}`, PAGE_MARGIN, y + 36);

  return y + 60;
};

// Bloc destinataire (client ou fournisseur).
export const drawRecipientBlock = (
  doc: PDFKit.PDFDocument,
  y: number,
  label: string,
  recipient: { nom: string; adresse?: string | null; telephone?: string | null; email?: string | null }
): number => {
  const x = PAGE_WIDTH - PAGE_MARGIN - 220;
  doc.fontSize(9).font('Helvetica-Bold').text(label, x, y, { width: 220, align: 'right' });
  doc.font('Helvetica').fontSize(9).text(recipient.nom, x, y + 13, { width: 220, align: 'right' });
  let ry = y + 26;
  for (const line of [recipient.adresse, recipient.telephone, recipient.email].filter(Boolean) as string[]) {
    doc.text(line, x, ry, { width: 220, align: 'right' });
    ry += 12;
  }
  return Math.max(y + 60, ry + 10);
};

export interface PdfLine {
  designation: string;
  quantite: number;
  prixUnitaire: number;
  remisePct?: number;
  tauxTaxe?: number;
  totalLigneHT: number;
}

const COL = { designation: PAGE_MARGIN, qte: 280, pu: 340, remise: 410, taxe: 460, total: 500 };

// Tableau des lignes (devis/commande/facture) — retourne le y après le tableau. Ne gère pas la
// pagination multi-page (limite MVP assumée, documents courts en pratique).
export const drawLinesTable = (doc: PDFKit.PDFDocument, y: number, lines: PdfLine[], devise: string): number => {
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('Désignation', COL.designation, y, { width: 230 });
  doc.text('Qté', COL.qte, y, { width: 50, align: 'right' });
  doc.text('P.U.', COL.pu, y, { width: 60, align: 'right' });
  doc.text('Remise', COL.remise, y, { width: 40, align: 'right' });
  doc.text('Taxe', COL.taxe, y, { width: 35, align: 'right' });
  doc.text('Total HT', COL.total, y, { width: 95, align: 'right' });
  y += 12;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor('#000000').stroke();
  y += 6;

  doc.font('Helvetica').fontSize(8);
  for (const line of lines) {
    doc.text(line.designation, COL.designation, y, { width: 230 });
    doc.text(String(line.quantite), COL.qte, y, { width: 50, align: 'right' });
    doc.text(formatMontant(line.prixUnitaire, devise), COL.pu, y, { width: 60, align: 'right' });
    doc.text(`${line.remisePct || 0}%`, COL.remise, y, { width: 40, align: 'right' });
    doc.text(`${line.tauxTaxe || 0}%`, COL.taxe, y, { width: 35, align: 'right' });
    doc.text(formatMontant(line.totalLigneHT, devise), COL.total, y, { width: 95, align: 'right' });
    y += 16;
  }
  y += 4;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor('#cccccc').stroke();
  return y + 10;
};

export interface PdfTotals {
  sousTotal: number;
  remiseGlobale?: number;
  totalTaxes: number;
  totalTTC: number;
  montantPaye?: number;
  soldeRestant?: number;
}

export const drawTotalsBlock = (doc: PDFKit.PDFDocument, y: number, totals: PdfTotals, devise: string): number => {
  const x = 380;
  const width = PAGE_WIDTH - PAGE_MARGIN - x;
  doc.fontSize(9).font('Helvetica');

  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
    doc.text(label, x, y, { width: width - 90 });
    doc.text(value, x + width - 90, y, { width: 90, align: 'right' });
    y += 14;
  };

  row('Sous-total HT', formatMontant(totals.sousTotal, devise));
  if (totals.remiseGlobale) row('Remise globale', `- ${formatMontant(totals.remiseGlobale, devise)}`);
  row('Taxes', formatMontant(totals.totalTaxes, devise));
  row('Total TTC', formatMontant(totals.totalTTC, devise), true);
  if (totals.montantPaye !== undefined) row('Déjà réglé', formatMontant(totals.montantPaye, devise));
  if (totals.soldeRestant !== undefined) row('Solde restant', formatMontant(totals.soldeRestant, devise), true);

  return y + 10;
};

// Pied de page : mentions commerciales + coordonnées de paiement (cahier des charges §12).
export const drawFooter = (doc: PDFKit.PDFDocument, company: Company): void => {
  const y = doc.page.height - 70;
  doc.moveTo(PAGE_MARGIN, y).lineTo(PAGE_WIDTH - PAGE_MARGIN, y).strokeColor('#cccccc').stroke();
  doc.fontSize(7).font('Helvetica').fillColor('#555555');
  let footerY = y + 6;
  if (company.coordonneesPaiement) {
    doc.text(`Coordonnées de paiement : ${company.coordonneesPaiement}`, PAGE_MARGIN, footerY, { width: PAGE_WIDTH - 2 * PAGE_MARGIN, align: 'center' });
    footerY += 10;
  }
  if (company.mentionsCommerciales) {
    doc.text(company.mentionsCommerciales, PAGE_MARGIN, footerY, { width: PAGE_WIDTH - 2 * PAGE_MARGIN, align: 'center' });
  }
  doc.fillColor('#000000');
};

export { formatMontant, formatDate };
