// lib/invoice-pdf-generator-enhanced.ts - CORRECTED VERSION
import jsPDF from 'jspdf';
import { Invoice, Lead, Mission, Quote } from '@prisma/client';
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
  formatCurrency,
  numberToFrenchWords
} from './pdf-utils';

type InvoiceWithRelations = Invoice & {
  lead: Lead;
  mission: (Mission & {
    quote: Quote | null;
  }) | null;
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

  // Get quote data if available
  const quote = invoice.mission?.quote;
  const businessType = quote?.businessType || 'SERVICE';
  
  // OBJET SECTION (for services only)
  if (businessType === 'SERVICE' && quote) {
    const objetBoxHeight = 32;
    const objetBoxY = yPos;
    
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(MARGIN_LEFT, objetBoxY, CONTENT_WIDTH, objetBoxHeight, 8, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(11);
    
    const objetText = `OBJET : ${invoice.description || 'Prestation de nettoyage'}`;
    const objetTextWidth = doc.getTextWidth(objetText);
    const objetTextX = MARGIN_LEFT + (CONTENT_WIDTH - objetTextWidth) / 2;
    doc.text(objetText, objetTextX, objetBoxY + 20);

    yPos = objetBoxY + objetBoxHeight + 25;
  }

  // CONTENT SECTION
  if (businessType === 'SERVICE' && quote) {
    yPos = renderServiceSectionForInvoice(doc, quote, yPos);
    yPos = renderForfaitTable(doc, invoice.description || 'Prestation de nettoyage', Number(invoice.amount), yPos);
  } else if (quote && quote.lineItems) {
    yPos = renderProductTableForInvoice(doc, quote.lineItems as any, yPos);
  }

  // PRICING SECTION WITH AMOUNT IN WORDS
  yPos = renderInvoicePricingSection(doc, invoice, yPos);

  // PAYMENT CONDITIONS
  yPos = renderPaymentConditions(doc, invoice, yPos, businessType);

  // FOOTER
  renderFooter(doc);

  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

function renderServiceSectionForInvoice(doc: jsPDF, quote: any, startY: number): number {
  let yPos = startY;

  const surface = quote.surface || 170;
  
  // 1. PERSONNEL
  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text('1- Personnel mobilisé:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  
  const teamSize = Math.ceil(surface / 50);
  const personnelItems = [
    'Chef d\'équipe : supervision et contrôle qualité',
    `Agent${teamSize > 1 ? 's' : ''} de nettoyage (${teamSize} personne${teamSize > 1 ? 's' : ''})`
  ];
  
  personnelItems.forEach((item) => {
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  // 2. ÉQUIPEMENTS
  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text('2- Équipements utilisés:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  
  const equipements = [
    'Aspirateurs professionnels',
    'Nettoyeurs vapeur',
    'Matériel de lavage professionnel'
  ];
  
  equipements.forEach((item) => {
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  // 3. PRODUITS (if materials specified)
  if (quote.lead?.materials) {
    yPos += 8;
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    setColor(doc, BLUE_PRIMARY);
    doc.text('3- Produits spécifiques utilisés:', MARGIN_LEFT, yPos);
    yPos += 14;
    
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(9);
    setColor(doc, TEXT_DARK);
    
    try {
      const materials = typeof quote.lead.materials === 'string' 
        ? JSON.parse(quote.lead.materials) 
        : quote.lead.materials;
      
      const materialNames: string[] = [];
      if (materials.marble) materialNames.push('Nettoyant pour marbre');
      if (materials.parquet) materialNames.push('Produit spécial bois');
      if (materials.tiles) materialNames.push('Dégraissant carrelage');
      if (materials.carpet) materialNames.push('Shampoing moquette');
      
      materialNames.forEach((name) => {
        doc.text(`• ${name}`, MARGIN_LEFT + 10, yPos);
        yPos += 13;
      });
    } catch (e) {
      console.warn('Error parsing materials:', e);
    }
  }

  // 4. PRESTATIONS
  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text('4- Détail des prestations:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  
  const prestations = [
    'Nettoyage complet des surfaces',
    'Dépoussiérage et désinfection',
    'Lavage des vitres',
    'Traitement des sols'
  ];
  
  prestations.forEach((item) => {
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  yPos += 20;
  return yPos;
}

function renderForfaitTable(doc: jsPDF, description: string, amount: number, startY: number): number {
  let yPos = startY;

  const tableStartY = yPos;
  const headerRowHeight = 45;
  const dataRowHeight = 50;
  const tableRadius = 8;

  // Table header
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerRowHeight, tableRadius, tableRadius, 'F');
  doc.rect(MARGIN_LEFT, tableStartY + headerRowHeight - tableRadius, CONTENT_WIDTH, tableRadius, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text('Désignation', MARGIN_LEFT + 15, tableStartY + 28);
  doc.text('Quantité', MARGIN_LEFT + 300, tableStartY + 28, { align: 'center' });
  doc.text('Prix unit. HT', MARGIN_LEFT + 395, tableStartY + 28, { align: 'center' });
  doc.text('Total HT', MARGIN_LEFT + CONTENT_WIDTH - 15, tableStartY + 28, { align: 'right' });

  // Data row
  yPos = tableStartY + headerRowHeight;
  doc.setFillColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, dataRowHeight, 'F');

  setColor(doc, TEXT_DARK);
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  
  const designationLines = doc.splitTextToSize(description, 220);
  const designationHeight = designationLines.length * 12;
  const designationStartY = yPos + (dataRowHeight - designationHeight) / 2 + 10;
  
  designationLines.forEach((line: string, index: number) => {
    doc.text(line, MARGIN_LEFT + 15, designationStartY + (index * 12));
  });
  
  doc.text('Forfait', MARGIN_LEFT + 300, yPos + 28, { align: 'center' });
  doc.text(formatCurrency(amount), MARGIN_LEFT + 395, yPos + 28, { align: 'center' });
  doc.text(formatCurrency(amount), MARGIN_LEFT + CONTENT_WIDTH - 15, yPos + 28, { align: 'right' });

  // Table border
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerRowHeight + dataRowHeight, tableRadius, tableRadius, 'S');
  doc.line(MARGIN_LEFT, tableStartY + headerRowHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerRowHeight);

  return yPos + dataRowHeight + 25;
}

function renderProductTableForInvoice(doc: jsPDF, lineItems: any[], startY: number): number {
  let yPos = startY;

  const tableStartY = yPos;
  const headerHeight = 45;
  const rowHeight = 35;
  const tableRadius = 8;
  
  // Header
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerHeight, tableRadius, tableRadius, 'F');
  doc.rect(MARGIN_LEFT, tableStartY + headerHeight - tableRadius, CONTENT_WIDTH, tableRadius, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text('Désignation', MARGIN_LEFT + 15, tableStartY + 28);
  doc.text('Qté', MARGIN_LEFT + 280, tableStartY + 28, { align: 'center' });
  doc.text('Prix U. HT', MARGIN_LEFT + 370, tableStartY + 28, { align: 'center' });
  doc.text('Total HT', MARGIN_LEFT + CONTENT_WIDTH - 15, tableStartY + 28, { align: 'right' });

  yPos = tableStartY + headerHeight;

  // Parse line items
  const items = Array.isArray(lineItems) ? lineItems : JSON.parse(lineItems as any);

  items.forEach((item: any, index: number) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, rowHeight, 'F');

    setColor(doc, TEXT_DARK);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(9);

    const desc = item.designation || item.description || 'Article';
    doc.text(desc, MARGIN_LEFT + 15, yPos + 22);
    doc.text(String(item.quantity || 1), MARGIN_LEFT + 280, yPos + 22, { align: 'center' });
    doc.text(formatCurrency(item.unitPrice || 0), MARGIN_LEFT + 370, yPos + 22, { align: 'center' });
    doc.text(formatCurrency(item.totalPrice || 0), MARGIN_LEFT + CONTENT_WIDTH - 15, yPos + 22, { align: 'right' });

    if (index < items.length - 1) {
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_LEFT, yPos + rowHeight, MARGIN_LEFT + CONTENT_WIDTH, yPos + rowHeight);
    }

    yPos += rowHeight;
  });

  const totalTableHeight = headerHeight + (items.length * rowHeight);
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, totalTableHeight, tableRadius, tableRadius, 'S');
  doc.line(MARGIN_LEFT, tableStartY + headerHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerHeight);

  return yPos + 10;
}

function renderInvoicePricingSection(
  doc: jsPDF, 
  invoice: InvoiceWithRelations, 
  startY: number
): number {
  let yPos = startY;

  const amount = Number(invoice.amount);
  const vatAmount = amount * 0.20;
  const totalTTC = amount + vatAmount;
  const amountInWords = numberToFrenchWords(totalTTC);

  const pricingY = yPos;
  
  // Ligne bleue supérieure
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_LEFT, pricingY, MARGIN_LEFT + CONTENT_WIDTH, pricingY);

  yPos = pricingY + 15;

  // 50% / 50% split
  const leftSectionWidth = CONTENT_WIDTH * 0.50;
  const separatorX = MARGIN_LEFT + leftSectionWidth;

  // Left side - Prix en lettres
  const priceText = `veuillez arrêter la présente facture au montant de ${amountInWords.toLowerCase()}, toutes taxes comprises.`;

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  const priceLines = doc.splitTextToSize(priceText, leftSectionWidth - 20);
  priceLines.forEach((line: string, index: number) => {
    doc.text(line, MARGIN_LEFT, yPos + (index * 11));
  });

  // Vertical separator
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(2.5);
  const separatorHeight = 90;
  doc.line(separatorX, pricingY + 10, separatorX, pricingY + 10 + separatorHeight);

  // Right side - Prix détaillés
  const rightStartX = separatorX + 20;
  const rightWidth = (CONTENT_WIDTH * 0.50) - 40;

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);

  let rightY = pricingY + 20;
  
  // Total HT
  doc.text('Total HT:', rightStartX, rightY);
  doc.text(formatCurrency(amount), rightStartX + rightWidth, rightY, { align: 'right' });
  rightY += 15;

  // TVA
  doc.text('TVA (20%):', rightStartX, rightY);
  doc.text(formatCurrency(vatAmount), rightStartX + rightWidth, rightY, { align: 'right' });
  rightY += 15;

  // Total TTC
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(doc, BLUE_PRIMARY);
  doc.text('Total TTC:', rightStartX, rightY);
  doc.text(formatCurrency(totalTTC), rightStartX + rightWidth, rightY, { align: 'right' });

  // Ligne bleue inférieure
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  const bottomLineY = pricingY + 10 + separatorHeight + 5;
  doc.line(MARGIN_LEFT, bottomLineY, MARGIN_LEFT + CONTENT_WIDTH, bottomLineY);

  return bottomLineY + 20;
}

function renderPaymentConditions(
  doc: jsPDF,
  invoice: InvoiceWithRelations,
  startY: number,
  businessType: string
): number {
  let yPos = startY;

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(doc, BLUE_PRIMARY);
  doc.text('CONDITIONS DE PAIEMENT', MARGIN_LEFT, yPos);
  yPos += 18;

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);

  const conditions = businessType === 'SERVICE' 
    ? [
        'Paiement exigible à réception de la facture',
        'Modes de paiement acceptés : Virement bancaire, Chèque, Espèces',
        `Échéance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`,
        'RIB : 0508 1002 5011 4358 9520 0174',
        'Tout retard de paiement entraînera l\'application de pénalités de retard'
      ]
    : [
        'Paiement à la livraison ou selon modalités convenues',
        'Modes de paiement : Virement, Chèque, Espèces',
        `Date d'échéance : ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}`,
        'RIB : 0508 1002 5011 4358 9520 0174'
      ];

  conditions.forEach(condition => {
    const lines = doc.splitTextToSize(`• ${condition}`, CONTENT_WIDTH - 20);
    lines.forEach((line: string) => {
      doc.text(line, MARGIN_LEFT + 10, yPos);
      yPos += 13;
    });
  });

  return yPos + 20;
}

function renderFooter(doc: jsPDF): void {
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
}