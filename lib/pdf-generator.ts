// lib/pdf-generator.ts - ENHANCED MODULAR PDF GENERATOR WITH PAGINATION
import jsPDF from 'jspdf';
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
  numberToFrenchWords,
  generateObjectTitle,
  loadPDFContent
} from './pdf-utils';
import { mapLeadMaterialsToProductKeys, getProductsForMaterials } from './pdf-material-products';

// PAGINATION CONSTANTS
const FOOTER_HEIGHT = 85;
const FOOTER_START_Y = PAGE_HEIGHT - FOOTER_HEIGHT;
const SAFE_CONTENT_END_Y = FOOTER_START_Y - 30; // 30pt margin before footer

// Type definitions for the PDF data structure
export type QuotePDFData = {
  docType: "DEVIS" | "FACTURE";
  number: string;
  date: string;
  purchaseOrderNumber?: string;
  orderedBy?: string;
  company: {
    name: string;
    address: string[];
    ice: string;
    if: string;
    rc: string;
    rib: string;
  };
  recipient: {
    isB2B: boolean;
    attention: string;
    addressLines: string[];
  };
  project: {
    serviceType: string | null;
    businessType: 'SERVICE' | 'PRODUCT';
    propertyType: string | null;
    surface: number | null;
    levels: number | null;
    objet: string;
  };
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    unit?: string;
  }> | undefined;
  prestation?: {
    personnelMobilise: string[];
    equipementsUtilises: string[];
    prestationsIncluses: string[];
    produitsSpecifiques?: string[];
    delaiPrevu: string;
  } | undefined;
  pricing: {
    subTotalHT: number;
    vatAmount: number;
    totalTTC: number;
    amountInWords: string;
  };
  payment: {
    title: string;
    conditions: string[];
  };
};

/**
 * Adds header to current page
 */
function addHeader(doc: jsPDF, data: QuotePDFData) {
  // 1. HEADER SECTION WITH GRADIENT BLUE BACKGROUND
  const headerHeight = 100;
  for (let i = 0; i < headerHeight; i++) {
    const ratio = i / headerHeight;
    const r = Math.floor(28 + (30 - 28) * ratio);
    const g = Math.floor(63 + (58 - 63) * ratio);
    const b = Math.floor(145 + (138 - 145) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, i, PAGE_WIDTH, 1, 'F');
  }

  // Document type (left side - vertically centered)
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(36);
  doc.text(data.docType, MARGIN_LEFT, 50);

  // OPTIMIZED: Document info on LEFT side (replaces company info)
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  let leftYPos = 70;
  
  doc.text(`Date: ${data.date}`, MARGIN_LEFT, leftYPos);
  leftYPos += 12;
  
  doc.text(`N° ${data.number}`, MARGIN_LEFT, leftYPos);
  leftYPos += 12;
  
  // Add Purchase Order info if exists
  if (data.purchaseOrderNumber) {
    doc.text(`Bon de commande: ${data.purchaseOrderNumber}`, MARGIN_LEFT, leftYPos);
    leftYPos += 12;
  }
  
  if (data.orderedBy) {
    doc.text(`Commandé par: ${data.orderedBy}`, MARGIN_LEFT, leftYPos);
  }

  // BIG Enarva logo TEXT (right side - aligned)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(40);
  doc.setTextColor(255, 255, 255);
  doc.text('enarva', PAGE_WIDTH - MARGIN_RIGHT - 130, 55);
}

/**
 * Adds footer to current page
 */
function addFooter(doc: jsPDF, data: QuotePDFData) {
  const footerY = FOOTER_START_Y;
  const footerRadius = 12;
  
  // Fond bleu avec marges gauche/droite + border radius en haut uniquement
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(MARGIN_LEFT, footerY, CONTENT_WIDTH, FOOTER_HEIGHT, footerRadius, footerRadius, 'F');
  doc.rect(MARGIN_LEFT, footerY + FOOTER_HEIGHT - footerRadius, CONTENT_WIDTH, footerRadius, 'F');

  const textStartX = MARGIN_LEFT + 15;
  const topMargin = 18;
  
  doc.setTextColor(255, 255, 255);
  
  // Ligne 1: LOGO "enarva" + "sarl au"
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(22);
  doc.text('enarva', textStartX, footerY + 28);
  
  const enarvaWidth = doc.getTextWidth('enarva');
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text('sarl au', textStartX + enarvaWidth + 6, footerY + 28);

  // Ligne 2: Adresse
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(8);
  doc.text(
    '53, 2ème étage, Appartement 15,  Avenue Brahim Roudani - Océan, Rabat - Maroc',
    textStartX,
    footerY + topMargin + 28
  );

  // Ligne 3: Contact
  doc.text(
    'Téléphone : 06 38 146-573 • Site web : www.enarva.com • e-mail : contact@enarva.com',
    textStartX,
    footerY + topMargin + 41
  );

  // Ligne 4: Informations légales
  doc.text(
    `IF : ${data.company.if} • RC : ${data.company.rc} • ICE : ${data.company.ice} • RIB : ${data.company.rib}`,
    textStartX,
    footerY + topMargin + 54
  );

  // QR CODE
  try {
    if (PDF_IMAGES.BARCODE) {
      const qrSize = 70;
      const qrX = MARGIN_LEFT + CONTENT_WIDTH - qrSize - 15;
      const qrY = footerY + (FOOTER_HEIGHT - qrSize) / 2;
      
      doc.addImage(PDF_IMAGES.BARCODE, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
    }
  } catch (e) {
    console.warn("QR code error:", e);
  }
}

/**
 * Adds background watermark
 */
function addBackgroundWatermark(doc: jsPDF) {
  try {
    if (PDF_IMAGES.BG_LOGO) {
      const logoWidth = 600;
      const logoHeight = 848;
      const logoX = (PAGE_WIDTH - logoWidth) / 2;
      const logoY = (PAGE_HEIGHT - logoHeight) / 2;
      
      doc.addImage(
        PDF_IMAGES.BG_LOGO,
        'PNG',
        logoX,
        logoY,
        logoWidth,
        logoHeight,
        undefined,
        'FAST'
      );
    }
  } catch (e) {
    console.warn("Background logo error:", e);
  }
}

/**
 * Checks if content will overflow and adds new page if needed
 */
function checkAndAddPage(doc: jsPDF, currentY: number, requiredSpace: number, data: QuotePDFData): number {
  if (currentY + requiredSpace > SAFE_CONTENT_END_Y) {
    doc.addPage();
    addBackgroundWatermark(doc);
    addHeader(doc, data);
    addFooter(doc, data);
    return 130; // Start below header on new page
  }
  return currentY;
}

/**
 * Generates a pixel-perfect PDF document with pagination support
 */
export function generateQuotePDF(data: QuotePDFData): Uint8Array {
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

  // Add background, header, and footer for first page
  addBackgroundWatermark(doc);
  addHeader(doc, data);
  addFooter(doc, data);

  let yPos = 120;

  // Client info (right aligned) - ONLY ON FIRST PAGE
  let clientYPos = 120;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  
  if (data.recipient.isB2B) {
    doc.text(data.recipient.attention.toUpperCase(), PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
  } else {
    doc.text(`À l'attention de ${data.recipient.attention}`, PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
  }

  clientYPos += 14;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  data.recipient.addressLines.forEach((line) => {
    doc.text(line, PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
    clientYPos += 12;
  });

  yPos = Math.max(yPos, clientYPos) + 20;

  // Check if we need new page before OBJET section
  yPos = checkAndAddPage(doc, yPos, 60, data);

  // OBJET SECTION - UNIQUEMENT POUR LES SERVICES
  if (data.project.businessType === 'SERVICE') {
    const objetBoxHeight = 32;
    const objetBoxY = yPos;
    
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(MARGIN_LEFT, objetBoxY, CONTENT_WIDTH, objetBoxHeight, 8, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(11);
    const objetText = `OBJET : ${data.project.objet}`;
    const objetTextWidth = doc.getTextWidth(objetText);
    const objetTextX = MARGIN_LEFT + (CONTENT_WIDTH - objetTextWidth) / 2;
    doc.text(objetText, objetTextX, objetBoxY + 20);

    yPos = objetBoxY + objetBoxHeight + 25;
  }

  // CONTENT SECTION WITH PAGINATION
  if (data.project.businessType === 'SERVICE' && data.prestation) {
    yPos = renderServiceSectionWithPagination(doc, data.prestation, yPos, data);
  } else if (data.lineItems) {
    yPos = renderProductTableWithPagination(doc, data.lineItems, yPos, data);
  }

  // Check before table
  yPos = checkAndAddPage(doc, yPos, 100, data);

  // TABLEAU FORFAIT - UNIQUEMENT POUR LES SERVICES
  if (data.project.businessType === 'SERVICE') {
    yPos += 10;
    const tableStartY = yPos;
    const headerRowHeight = 45;
    const dataRowHeight = 50;
    const tableRadius = 8;

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

    yPos = tableStartY + headerRowHeight;
    doc.setFillColor(255, 255, 255);
    doc.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, dataRowHeight, 'F');

    setColor(doc, TEXT_DARK);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(9);
    
    const designationLines = doc.splitTextToSize(data.project.objet, 220);
    const designationHeight = designationLines.length * 12;
    const designationStartY = yPos + (dataRowHeight - designationHeight) / 2 + 10;
    
    designationLines.forEach((line: string, index: number) => {
      doc.text(line, MARGIN_LEFT + 15, designationStartY + (index * 12));
    });
    
    doc.text('Forfait', MARGIN_LEFT + 300, yPos + 28, { align: 'center' });
    doc.text(formatCurrency(data.pricing.subTotalHT), MARGIN_LEFT + 395, yPos + 28, { align: 'center' });
    doc.text(formatCurrency(data.pricing.subTotalHT), MARGIN_LEFT + CONTENT_WIDTH - 15, yPos + 28, { align: 'right' });

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1.5);
    doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerRowHeight + dataRowHeight, tableRadius, tableRadius, 'S');
    doc.line(MARGIN_LEFT, tableStartY + headerRowHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerRowHeight);

    yPos += dataRowHeight + 25;
  }

  // Check before pricing section
  yPos = checkAndAddPage(doc, yPos, 120, data);

  // PRICING SECTION
  yPos = renderPricingSection(doc, data, yPos);

  // Check before payment conditions
  yPos = checkAndAddPage(doc, yPos, 80, data);

  // PAYMENT CONDITIONS
  yPos = renderPaymentConditions(doc, data, yPos);

  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

function renderServiceSectionWithPagination(
  doc: jsPDF,
  prestation: NonNullable<QuotePDFData['prestation']>,
  startY: number,
  data: QuotePDFData
): number {
  let yPos = startY;

  // Check space for title
  yPos = checkAndAddPage(doc, yPos, 30, data);

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(doc, BLUE_PRIMARY);
  doc.text('I. PRESTATIONS INCLUSES', MARGIN_LEFT, yPos);
  yPos += 18;

  // 1- Personnel
  yPos = checkAndAddPage(doc, yPos, 20 + (prestation.personnelMobilise.length * 13), data);
  
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text('1- Personnel mobilisé:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.personnelMobilise.forEach((item) => {
    yPos = checkAndAddPage(doc, yPos, 13, data);
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  // 2- Équipements
  yPos += 8;
  yPos = checkAndAddPage(doc, yPos, 20 + (prestation.equipementsUtilises.length * 13), data);
  
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text('2- Équipements & Produits utilisés:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.equipementsUtilises.forEach((item) => {
    yPos = checkAndAddPage(doc, yPos, 13, data);
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  // 3- Produits spécifiques
  if (prestation.produitsSpecifiques && prestation.produitsSpecifiques.length > 0) {
    yPos += 8;
    yPos = checkAndAddPage(doc, yPos, 20 + (prestation.produitsSpecifiques.length * 26), data);
    
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    setColor(doc, BLUE_PRIMARY);
    doc.text('3- Produits spécifiques aux matériaux:', MARGIN_LEFT, yPos);
    yPos += 14;
    
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(9);
    setColor(doc, TEXT_DARK);
    prestation.produitsSpecifiques.forEach((item) => {
      const lines = doc.splitTextToSize(`• ${item}`, CONTENT_WIDTH - 20);
      const linesHeight = lines.length * 13;
      yPos = checkAndAddPage(doc, yPos, linesHeight, data);
      
      lines.forEach((line: string) => {
        doc.text(line, MARGIN_LEFT + 10, yPos);
        yPos += 13;
      });
    });
  }

  // 4- Prestations
  yPos += 8;
  const prestationNumber = prestation.produitsSpecifiques ? '4' : '3';
  yPos = checkAndAddPage(doc, yPos, 20 + (prestation.prestationsIncluses.length * 26), data);
  
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text(`${prestationNumber}- Détail des prestations:`, MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.prestationsIncluses.forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, CONTENT_WIDTH - 20);
    const linesHeight = lines.length * 13;
    yPos = checkAndAddPage(doc, yPos, linesHeight, data);
    
    lines.forEach((line: string) => {
      doc.text(line, MARGIN_LEFT + 10, yPos);
      yPos += 13;
    });
  });

  // 5- Délai
  yPos += 8;
  const delaiNumber = prestation.produitsSpecifiques ? '5' : '4';
  yPos = checkAndAddPage(doc, yPos, 30, data);
  
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text(`${delaiNumber}- Délai prévu de la prestation:`, MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  doc.text(`• ${prestation.delaiPrevu}`, MARGIN_LEFT + 10, yPos);
  yPos += 20;

  return yPos;
}

function renderProductTableWithPagination(
  doc: jsPDF,
  lineItems: QuotePDFData['lineItems'],
  startY: number,
  data: QuotePDFData
): number {
  let yPos = startY;

  const isLinearMeter = data.project.serviceType === 'NETTOYAGE_CANAPES';
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

  if (isLinearMeter) {
    doc.text('Désignation', MARGIN_LEFT + 15, tableStartY + 28);
    doc.text('Quantité', MARGIN_LEFT + 280, tableStartY + 28, { align: 'center' });
    doc.text('Unité', MARGIN_LEFT + 350, tableStartY + 28, { align: 'center' });
    doc.text('PU HT', MARGIN_LEFT + 420, tableStartY + 28, { align: 'center' });
    doc.text('Total HT', MARGIN_LEFT + CONTENT_WIDTH - 15, tableStartY + 28, { align: 'right' });
  } else {
    doc.text('Désignation', MARGIN_LEFT + 15, tableStartY + 28);
    doc.text('Quantité', MARGIN_LEFT + 300, tableStartY + 28, { align: 'center' });
    doc.text('PU HT', MARGIN_LEFT + 395, tableStartY + 28, { align: 'center' });
    doc.text('Total HT', MARGIN_LEFT + CONTENT_WIDTH - 15, tableStartY + 28, { align: 'right' });
  }

  yPos += headerHeight;

  setColor(doc, TEXT_DARK);
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);

  if (lineItems) {
    lineItems.forEach((item, index) => {
      // Check if row fits, if not add new page
      yPos = checkAndAddPage(doc, yPos, rowHeight, data);
      
      const rowY = yPos;
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(MARGIN_LEFT, rowY, CONTENT_WIDTH, rowHeight, 'F');
      } else {
        doc.setFillColor(255, 255, 255);
        doc.rect(MARGIN_LEFT, rowY, CONTENT_WIDTH, rowHeight, 'F');
      }

      const verticalCenter = rowY + (rowHeight / 2) + 3;

      if (isLinearMeter) {
        doc.text(item.description, MARGIN_LEFT + 15, verticalCenter);
        doc.text(item.quantity.toString(), MARGIN_LEFT + 280, verticalCenter, { align: 'center' });
        doc.text(item.unit || 'ml', MARGIN_LEFT + 350, verticalCenter, { align: 'center' });
        doc.text(formatCurrency(item.unitPrice), MARGIN_LEFT + 420, verticalCenter, { align: 'center' });
        doc.text(formatCurrency(item.totalPrice), MARGIN_LEFT + CONTENT_WIDTH - 15, verticalCenter, { align: 'right' });
      } else {
        const descLines = doc.splitTextToSize(item.description, 220);
        const descHeight = descLines.length * 11;
        const descStartY = rowY + (rowHeight - descHeight) / 2 + 8;
        
        descLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, MARGIN_LEFT + 15, descStartY + (lineIndex * 11));
        });
        
        doc.text(item.quantity.toString(), MARGIN_LEFT + 300, verticalCenter, { align: 'center' });
        doc.text(formatCurrency(item.unitPrice), MARGIN_LEFT + 395, verticalCenter, { align: 'center' });
        doc.text(formatCurrency(item.totalPrice), MARGIN_LEFT + CONTENT_WIDTH - 15, verticalCenter, { align: 'right' });
      }

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      if (index < lineItems.length - 1) {
        doc.line(MARGIN_LEFT, rowY + rowHeight, MARGIN_LEFT + CONTENT_WIDTH, rowY + rowHeight);
      }
      
      yPos += rowHeight;
    });
  }

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  const totalTableHeight = headerHeight + (lineItems ? lineItems.length * rowHeight : 0);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, totalTableHeight, tableRadius, tableRadius, 'S');
  doc.line(MARGIN_LEFT, tableStartY + headerHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerHeight);

  return yPos + 10;
}

function renderPricingSection(doc: jsPDF, data: QuotePDFData, startY: number): number {
  let yPos = startY;
  const pricingY = yPos;
  
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_LEFT, pricingY, MARGIN_LEFT + CONTENT_WIDTH, pricingY);

  yPos = pricingY + 15;

  const leftSectionWidth = CONTENT_WIDTH * 0.50;
  const separatorX = MARGIN_LEFT + leftSectionWidth;

  const amountInWordsLower = data.pricing.amountInWords.toLowerCase();
  const priceText = data.docType === 'DEVIS'
    ? `veuillez arrêter le présent devis à la somme de ${amountInWordsLower}.`
    : `veuillez arrêter la présente facture au montant de ${amountInWordsLower}, toutes taxes comprises.`;

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  const priceLines = doc.splitTextToSize(priceText, leftSectionWidth - 20);
  priceLines.forEach((line: string, index: number) => {
    doc.text(line, MARGIN_LEFT, yPos + (index * 11));
  });

  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(2.5);
  const separatorHeight = data.docType === 'FACTURE' ? 50 : 32;
  doc.line(separatorX, pricingY + 5, separatorX, yPos + separatorHeight);

  const priceBoxX = separatorX + 25;

  if (data.docType === 'FACTURE') {
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    setColor(doc, TEXT_DARK);
    doc.text('MONTANT TOTAL HT', priceBoxX, yPos + 10);
    doc.text(':', priceBoxX + 125, yPos + 10);
    doc.text(formatCurrency(data.pricing.subTotalHT), priceBoxX + 135, yPos + 10);
    
    doc.text('TVA (20%)', priceBoxX, yPos + 26);
    doc.text(':', priceBoxX + 125, yPos + 26);
    doc.text(formatCurrency(data.pricing.vatAmount), priceBoxX + 135, yPos + 26);
    
    doc.setFontSize(12);
    doc.text('TOTAL TTC', priceBoxX, yPos + 45);
    doc.text(':', priceBoxX + 125, yPos + 45);
    doc.text(formatCurrency(data.pricing.totalTTC), priceBoxX + 135, yPos + 45);
  } else {
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(12);
    setColor(doc, TEXT_DARK);
    
    doc.text('MONTANT TOTAL HT', priceBoxX, yPos + 20);
    doc.text(':', priceBoxX + 135, yPos + 20);
    doc.text(formatCurrency(data.pricing.subTotalHT), priceBoxX + 145, yPos + 20);
  }

  yPos += data.docType === 'FACTURE' ? 58 : 42;
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_LEFT, yPos, MARGIN_LEFT + CONTENT_WIDTH, yPos);

  yPos += 18;
  return yPos;
}

function renderPaymentConditions(doc: jsPDF, data: QuotePDFData, startY: number): number {
  let yPos = startY;

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text(data.payment.title, MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);

  const bulletIndent = 10;
  const textIndent = 18;
  const conditionsMaxWidth = CONTENT_WIDTH - textIndent;

  data.payment.conditions.forEach((condition) => {
    const lines = doc.splitTextToSize(condition, conditionsMaxWidth);
    const linesHeight = lines.length * 14;
    
    // Check if all lines fit, if not start on new page
    yPos = checkAndAddPage(doc, yPos, linesHeight, data);

    doc.text('•', MARGIN_LEFT + bulletIndent, yPos);

    lines.forEach((line: string) => {
      doc.text(line, MARGIN_LEFT + textIndent, yPos);
      yPos += 14;
    });
  });

  return yPos;
}

export function prepareQuotePDFData(
  quote: any,
  docType: 'DEVIS' | 'FACTURE' = 'DEVIS'
): QuotePDFData {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const pdfContent = loadPDFContent();
  const isB2B = quote.lead.leadType === 'PROFESSIONNEL' || quote.lead.leadType === 'B2B';

  let recipientAttention = '';
  let recipientAddressLines: string[] = [];

  if (isB2B) {
    recipientAttention = quote.lead.company || 'Entreprise';
    recipientAddressLines = [
      quote.lead.address || 'Adresse non spécifiée',
      'Maroc'
    ];
    if (quote.lead.iceNumber) {
      recipientAddressLines.push(`ICE: ${quote.lead.iceNumber}`);
    }
  } else {
    recipientAttention = `${quote.lead.firstName || ''} ${quote.lead.lastName || ''}`.trim();
    recipientAddressLines = [
      quote.lead.address || 'Adresse non spécifiée',
      'Maroc'
    ];
  }

  const objectTitle = generateObjectTitle(
    quote.serviceType,
    quote.propertyType,
    quote.surface,
    quote.levels,
    pdfContent
  );

  let prestationData: {
    personnelMobilise: string[];
    equipementsUtilises: string[];
    prestationsIncluses: string[];
    produitsSpecifiques?: string[];
    delaiPrevu: string;
  } | undefined = undefined;

  let lineItemsData: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    unit?: string;
  }> | undefined = undefined;

  if (quote.businessType === 'SERVICE') {
    const serviceConfig = pdfContent.serviceTypes[quote.serviceType] || pdfContent.serviceTypes['FIN_DE_CHANTIER'];
    
    const teamSize = Math.ceil((quote.surface || 170) / serviceConfig.personnelSuggestions.perSquareMeter);
    const personnelMobilise = [
      'Chef d\'équipe : supervision et contrôle qualité',
      `Agent${teamSize > 1 ? 's' : ''} de nettoyage (${teamSize} personne${teamSize > 1 ? 's' : ''})`
    ];

    // Get material-specific products - CHECK BOTH QUOTE AND LEAD
    let produitsSpecifiques: string[] = [];
    const materialsSource = quote.materials || quote.lead?.materials;
    
    if (materialsSource) {
      const materialMap = mapLeadMaterialsToProductKeys(materialsSource);
      const materialProducts = getProductsForMaterials(materialMap);
      produitsSpecifiques = materialProducts.map(product => 
        product.description ? `${product.name} - ${product.description}` : product.name
      );
    }

    prestationData = {
      personnelMobilise,
      equipementsUtilises: serviceConfig.equipementsUtilises || [],
      prestationsIncluses: serviceConfig.prestationsIncluses || [],
      ...(produitsSpecifiques.length > 0 && { produitsSpecifiques }),
      delaiPrevu: pdfContent.deliveryTimeframes[quote.deliveryType || 'STANDARD'] || '3-5 jours ouvrés'
    };
  } else if (quote.lineItems && Array.isArray(quote.lineItems)) {
    lineItemsData = quote.lineItems.map((item: any) => ({
      description: item.description || 'Produit',
      quantity: item.quantity || 1,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
      unit: item.unit
    }));
  }

  const subTotalHT = Number(quote.subTotalHT) || Number(quote.finalPrice);
  const vatAmount = Number(quote.vatAmount) || (subTotalHT * 0.20);
  const totalTTC = docType === 'FACTURE' ? (subTotalHT + vatAmount) : subTotalHT;

  const depositPercentage = isB2B ? 40 : 30;
  const depositAmount = (subTotalHT * depositPercentage) / 100;

  let paymentConfig;
  if (docType === 'FACTURE') {
    paymentConfig = quote.businessType === 'SERVICE' 
      ? pdfContent.paymentConditions.FACTURE_SERVICE
      : (pdfContent.paymentConditions.FACTURE_PRODUIT || pdfContent.paymentConditions.FACTURE_SERVICE);
  } else {
    const baseConditions = isB2B
      ? pdfContent.paymentConditions.DEVIS_SERVICE_PRO || pdfContent.paymentConditions.DEVIS_SERVICE_PARTICULIER
      : pdfContent.paymentConditions.DEVIS_SERVICE_PARTICULIER;

    const depositText = isB2B
      ? `Un acompte de ${depositPercentage}% du montant total, soit la somme de ${formatCurrency(depositAmount)}, exigible à la signature pour début des prestations.`
      : `Un acompte de ${depositPercentage}% du montant total, soit la somme de ${formatCurrency(depositAmount)}, payable à la signature pour validation de commande.`;

    const dynamicConditions = baseConditions.conditions.map((condition: string) => {
      if (condition.includes('acompte') || condition.includes('%')) {
        return depositText;
      }
      return condition;
    });

    paymentConfig = {
      title: baseConditions.title,
      conditions: dynamicConditions
    };
  }

  const paymentConditions = [...paymentConfig.conditions];
  if (quote.purchaseOrderNumber && quote.orderedBy) {
    paymentConditions.unshift(`Commandé par: ${quote.orderedBy}`);
    paymentConditions.unshift(`Bon de commande: ${quote.purchaseOrderNumber}`);
  }

  const result: QuotePDFData = {
    docType,
    number: quote.quoteNumber.replace(/^(Q-|DEV-|DV-|F-|FAC-)/, ''),
    date: today,
    purchaseOrderNumber: quote.purchaseOrderNumber,
    orderedBy: quote.orderedBy,
    company: {
      name: 'Enarva sarl au',
      address: [
        '53, 2ème étage, Appartement 15,',
        'Av. Brahim Roudani',
        'Océan, Rabat - Maroc'
      ],
      ice: '003620340000048',
      if: '66157207',
      rc: '182523',
      rib: '0508 1002 5011 4358 9520 0174'
    },
    recipient: {
      isB2B,
      attention: recipientAttention,
      addressLines: recipientAddressLines
    },
    project: {
      serviceType: quote.serviceType,
      businessType: quote.businessType,
      propertyType: quote.propertyType,
      surface: quote.surface,
      levels: quote.levels,
      objet: objectTitle
    },
    lineItems: lineItemsData,
    prestation: prestationData,
    pricing: {
      subTotalHT,
      vatAmount,
      totalTTC,
      amountInWords: numberToFrenchWords(docType === 'FACTURE' ? totalTTC : subTotalHT)
    },
    payment: {
      title: paymentConfig.title,
      conditions: paymentConditions
    }
  };

  return result;
}

export default generateQuotePDF;