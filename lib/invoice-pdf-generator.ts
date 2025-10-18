// lib/invoice-pdf-generator.ts - FINAL CORRECTED VERSION
import jsPDF from 'jspdf';
import { Invoice, Lead, Mission, InvoiceStatus } from '@prisma/client';
import { poppinsNormal, poppinsBold } from './fonts';
import { PDF_IMAGES } from './pdf-assets';
import {
  BLUE_PRIMARY,
  TEXT_DARK,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
  setColor,
  formatCurrency
} from './pdf-utils';

type InvoiceWithRelations = Invoice & {
  lead: Lead;
  mission: Mission | null;
};

export function generateInvoicePDF(invoice: InvoiceWithRelations): Uint8Array {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  // Load Poppins fonts
  try {
    doc.addFileToVFS('Poppins-Regular.ttf', poppinsNormal);
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
    // [FIXED] Corrected the typo from 'addFileToVfs' to 'addFileToVFS'
    doc.addFileToVFS('Poppins-Bold.ttf', poppinsBold);
    doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
  } catch (e) {
    console.warn("Error loading Poppins fonts:", e);
  }

  // Background watermark
  try {
    if (PDF_IMAGES.BG_LOGO) {
      const logoWidth = 600;
      const logoHeight = 848;
      const logoX = (PAGE_WIDTH - logoWidth) / 2;
      const logoY = (PAGE_HEIGHT - logoHeight) / 2;
      doc.addImage(PDF_IMAGES.BG_LOGO, 'PNG', logoX, logoY, logoWidth, logoHeight, undefined, 'FAST');
    }
  } catch (e) {
    console.warn("Background logo error:", e);
  }

  let yPos = 0;

  // HEADER WITH GRADIENT
  const headerHeight = 100;
  for (let i = 0; i < headerHeight; i++) {
    const ratio = i / headerHeight;
    const r = Math.floor(28 + (30 - 28) * ratio);
    const g = Math.floor(63 + (58 - 63) * ratio);
    const b = Math.floor(145 + (138 - 145) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, i, PAGE_WIDTH, 1, 'F');
  }

  // Document type
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(36);
  doc.text('FACTURE', MARGIN_LEFT, 50);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  const issueDate = new Date(invoice.issueDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  doc.text(`Date: ${issueDate}`, MARGIN_LEFT, 70);
  doc.text(`N° ${invoice.invoiceNumber}`, MARGIN_LEFT, 85);

  // Enarva logo text
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(40);
  doc.text('enarva', PAGE_WIDTH - MARGIN_RIGHT - 130, 55);

  yPos = 120;

  // COMPANY INFO
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, TEXT_DARK);
  doc.text('Enarva sarl au', MARGIN_LEFT, yPos);

  yPos += 14;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text('53, 2ème étage, Appartement 15,', MARGIN_LEFT, yPos);
  yPos += 12;
  doc.text('Av. Brahim Roudani', MARGIN_LEFT, yPos);
  yPos += 12;
  doc.text('Océan, Rabat - Maroc', MARGIN_LEFT, yPos);

  // CLIENT INFO (right aligned)
  let clientYPos = 120;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  
  const isB2B = invoice.lead.leadType === 'PROFESSIONNEL';
  
  if (isB2B && invoice.lead.company) {
    doc.text(invoice.lead.company.toUpperCase(), PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
  } else {
    const clientName = `${invoice.lead.firstName || ''} ${invoice.lead.lastName || ''}`.trim();
    doc.text(`À l'attention de ${clientName}`, PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
  }

  clientYPos += 14;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  
  if (invoice.lead.address) {
    doc.text(invoice.lead.address, PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
    clientYPos += 12;
  }
  
  doc.text('Maroc', PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
  clientYPos += 12;
  
  if (isB2B && invoice.lead.iceNumber) {
    doc.text(`ICE: ${invoice.lead.iceNumber}`, PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
    clientYPos += 12;
  }

  yPos = Math.max(yPos, clientYPos) + 20;

  // DESCRIPTION SECTION
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(doc, BLUE_PRIMARY);
  doc.text('DESCRIPTION', MARGIN_LEFT, yPos);
  yPos += 14;

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  const description = invoice.description || 'Prestation de nettoyage';
  const splitDescription = doc.splitTextToSize(description, CONTENT_WIDTH - 40);
  splitDescription.forEach((line: string) => {
    doc.text(line, MARGIN_LEFT, yPos);
    yPos += 12;
  });

  yPos += 20;

  // PAYMENT DETAILS TABLE
  const tableStartY = yPos;
  const headerRowHeight = 45;
  const dataRowHeight = 35;
  const tableRadius = 8;

  // Table header
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerRowHeight, tableRadius, tableRadius, 'F');
  doc.rect(MARGIN_LEFT, tableStartY + headerRowHeight - tableRadius, CONTENT_WIDTH, tableRadius, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text('DÉTAIL DU PAIEMENT', MARGIN_LEFT + 15, tableStartY + 28);

  yPos = tableStartY + headerRowHeight;

  // Payment rows
  const amount = Number(invoice.amount);
  const advanceAmount = Number(invoice.advanceAmount);
  const remainingAmount = Number(invoice.remainingAmount);
  const isPaid = remainingAmount === 0;

  const paymentRows = [
    { label: 'Montant Total HT', value: formatCurrency(amount), bold: true },
    { label: 'TVA (20%)', value: formatCurrency(amount * 0.20), normal: true },
    { label: 'Total TTC', value: formatCurrency(amount * 1.20), bold: true, big: true },
    { label: 'Avance Payée', value: formatCurrency(advanceAmount), color: '#10b981' },
    { label: 'Reste à Payer', value: formatCurrency(remainingAmount), bold: true, color: isPaid ? '#10b981' : '#ef4444' }
  ];

  paymentRows.forEach((row, index) => {
    const rowY = yPos + (index * dataRowHeight);
    
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(MARGIN_LEFT, rowY, CONTENT_WIDTH, dataRowHeight, 'F');
    } else {
      doc.setFillColor(255, 255, 255);
      doc.rect(MARGIN_LEFT, rowY, CONTENT_WIDTH, dataRowHeight, 'F');
    }

    const verticalCenter = rowY + (dataRowHeight / 2) + 3;

    doc.setFont('Poppins', row.bold ? 'bold' : 'normal');
    doc.setFontSize(row.big ? 12 : 10);
    
    if (row.color) {
      const rgb = hexToRgb(row.color);
      doc.setTextColor(rgb.r, rgb.g, rgb.b);
    } else {
      setColor(doc, TEXT_DARK);
    }
    
    doc.text(row.label, MARGIN_LEFT + 15, verticalCenter);
    doc.text(row.value, MARGIN_LEFT + CONTENT_WIDTH - 15, verticalCenter, { align: 'right' });
    
    doc.setTextColor(0, 0, 0);

    if (index < paymentRows.length - 1) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_LEFT, rowY + dataRowHeight, MARGIN_LEFT + CONTENT_WIDTH, rowY + dataRowHeight);
    }
  });

  const totalTableHeight = headerRowHeight + (paymentRows.length * dataRowHeight);
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, totalTableHeight, tableRadius, tableRadius, 'S');
  doc.line(MARGIN_LEFT, tableStartY + headerRowHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerRowHeight);

  yPos += (paymentRows.length * dataRowHeight) + 30;

  // STATUS BADGE
  const statusConfig = getInvoiceStatusConfig(invoice.status);
  const statusRgb = hexToRgb(statusConfig.color);
  doc.setFillColor(statusRgb.r, statusRgb.g, statusRgb.b, 0.2);
  doc.roundedRect(MARGIN_LEFT, yPos - 5, 80, 20, 5, 5, 'F');
  
  doc.setTextColor(statusRgb.r, statusRgb.g, statusRgb.b);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text(statusConfig.label.toUpperCase(), MARGIN_LEFT + 40, yPos + 8, { align: 'center' });

  yPos += 40;

  // PAYMENT INSTRUCTIONS
  if (!isPaid) {
    doc.setTextColor(100, 100, 100);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(9);
    
    const dueDate = new Date(invoice.dueDate).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    doc.text(`Merci de régler cette facture avant le ${dueDate}.`, MARGIN_LEFT, yPos);
    yPos += 14;
    doc.text('Mode de paiement: Virement bancaire, Chèque ou Espèces', MARGIN_LEFT, yPos);
    yPos += 14;
    doc.text('RIB: 0508 1002 5011 4358 9520 0174', MARGIN_LEFT, yPos);
  } else {
    doc.setTextColor(16, 185, 129);
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    doc.text('✓ Facture payée intégralement', MARGIN_LEFT, yPos);
  }

  // FOOTER
  const footerHeight = 85;
  const footerY = PAGE_HEIGHT - footerHeight;
  const footerRadius = 12;
  
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(MARGIN_LEFT, footerY, CONTENT_WIDTH, footerHeight, footerRadius, footerRadius, 'F');
  doc.rect(MARGIN_LEFT, footerY + footerHeight - footerRadius, CONTENT_WIDTH, footerRadius, 'F');

  const textStartX = MARGIN_LEFT + 15;
  const topMargin = 18;
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(22);
  doc.text('enarva', textStartX, footerY + 28);
  
  const enarvaWidth = doc.getTextWidth('enarva');
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text('sarl au', textStartX + enarvaWidth + 6, footerY + 28);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(8);
  doc.text(
    '53, 2ème étage, Appartement 15, Avenue Brahim Roudani - Océan, Rabat - Maroc',
    textStartX,
    footerY + topMargin + 28
  );

  doc.text(
    'Téléphone : 06 38 146-573 • Site web : www.enarva.com • e-mail : contact@enarva.com',
    textStartX,
    footerY + topMargin + 41
  );

  doc.text(
    'IF : 66157207 • RC : 182523 • ICE : 003620340000048 • RIB : 0508 1002 5011 4358 9520 0174',
    textStartX,
    footerY + topMargin + 54
  );

  // QR CODE
  try {
    if (PDF_IMAGES.BARCODE) {
      const qrSize = 70;
      const qrX = MARGIN_LEFT + CONTENT_WIDTH - qrSize - 15;
      const qrY = footerY + (footerHeight - qrSize) / 2;
      doc.addImage(PDF_IMAGES.BARCODE, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
    }
  } catch (e) {
    console.warn("QR code error:", e);
  }

  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

/**
 * Converts a hex color string to an RGB object.
 * This version safely handles invalid hex codes by returning a default
 * value (black) if the input string doesn't match the expected format.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  if (result && result[1] && result[2] && result[3]) {
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
  }
  
  return { r: 0, g: 0, b: 0 };
}

/**
 * Returns a configuration object for a given invoice status.
 * This version ensures it always returns a valid config object, even if
 * the status is unknown, by falling back to the 'DRAFT' configuration.
 */
function getInvoiceStatusConfig(status: InvoiceStatus): { label: string; color: string } {
  const configs: Record<InvoiceStatus, { label: string; color: string }> = {
    DRAFT: { label: 'Brouillon', color: '#64748b' },
    SENT: { label: 'Envoyée', color: '#3b82f6' },
    PAID: { label: 'Payée', color: '#10b981' },
    OVERDUE: { label: 'En retard', color: '#ef4444' },
    CANCELLED: { label: 'Annulée', color: '#64748b' }
  };

  return configs[status] || configs.DRAFT;
}