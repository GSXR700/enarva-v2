// lib/pdf-generator.ts - ENHANCED MODULAR PDF GENERATOR WITH IMAGES
import jsPDF from 'jspdf';
import { poppinsNormal, poppinsBold } from './fonts';
import { PDF_IMAGES } from './pdf-assets';
import {
  BLUE_PRIMARY,
  BLUE_DARK,
  TEXT_DARK,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
  setColor,
  setFillColor,
  formatCurrency,
  numberToFrenchWords,
  generateObjectTitle,
  loadPDFContent
} from './pdf-utils';

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
 * Generates a pixel-perfect PDF document matching Enarva's design with embedded images
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

  // ✅ ADD BACKGROUND WATERMARK LOGO FIRST (BEFORE ANY OTHER CONTENT)
  try {
    if (PDF_IMAGES.BG_LOGO) {
      // Calculate centered position for watermark
      const logoWidth = 600; // Adjust size as needed
      const logoHeight = 848; // Adjust size as needed
      const logoX = (PAGE_WIDTH - logoWidth) / 2;
      const logoY = (PAGE_HEIGHT - logoHeight) / 2;
      
      // Add the background image (PNG with transparency built-in)
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

  let yPos = 0;

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

  // Date and number below DEVIS (smaller and closer)
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${data.date}`, MARGIN_LEFT, 70);
  doc.text(`N ° ${data.number}`, MARGIN_LEFT, 85);

  // BIG Enarva logo TEXT (right side - aligned)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(40);
  doc.setTextColor(255, 255, 255);
  doc.text('enarva', PAGE_WIDTH - MARGIN_RIGHT - 130, 55);

  yPos = 120;

  // 2. COMPANY AND CLIENT INFO (TWO COLUMNS)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, TEXT_DARK);
  doc.text(data.company.name, MARGIN_LEFT, yPos);

  yPos += 14;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  data.company.address.forEach((line) => {
    doc.text(line, MARGIN_LEFT, yPos);
    yPos += 12;
  });

  // Client info (right aligned)
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

  // 3. PURCHASE ORDER INFO (if applicable)
  if (data.purchaseOrderNumber && data.orderedBy) {
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(9);
    setColor(doc, BLUE_PRIMARY);
    doc.text(`N° Bon de Commande: ${data.purchaseOrderNumber}`, MARGIN_LEFT, yPos);
    yPos += 15;
    doc.text(`Commandé par: ${data.orderedBy}`, MARGIN_LEFT, yPos);
    yPos += 20;
  }

  // 4. OBJET SECTION - CENTERED TEXT IN BLUE ROUNDED BOX (FABULOUS COLOR)
  const objetBoxHeight = 32;
  const objetBoxY = yPos;
  
  // Beautiful blue rounded rectangle
  doc.setFillColor(59, 130, 246);
  doc.roundedRect(MARGIN_LEFT, objetBoxY, CONTENT_WIDTH, objetBoxHeight, 8, 8, 'F');
  
  // Centered white bold text
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  const objetText = `OBJET : ${data.project.objet}`;
  const objetTextWidth = doc.getTextWidth(objetText);
  const objetTextX = MARGIN_LEFT + (CONTENT_WIDTH - objetTextWidth) / 2;
  doc.text(objetText, objetTextX, objetBoxY + 20);

  yPos = objetBoxY + objetBoxHeight + 25;

  // 5. CONTENT SECTION
  if (data.project.businessType === 'SERVICE' && data.prestation) {
    yPos = renderServiceSection(doc, data.prestation, yPos);
  } else if (data.lineItems) {
    yPos = renderProductTable(doc, data.lineItems, yPos, data.project.serviceType);
  }

  // 6. PROFESSIONAL TABLE WITH GRADIENT HEADER AND BORDER RADIUS
  yPos += 10;
  const tableStartY = yPos;
  const headerRowHeight = 45;
  const dataRowHeight = 50;
  const tableRadius = 8;

  // Table header with gradient and rounded top
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerRowHeight, tableRadius, tableRadius, 'F');
  
  // Cover bottom corners to make them square
  doc.rect(MARGIN_LEFT, tableStartY + headerRowHeight - tableRadius, CONTENT_WIDTH, tableRadius, 'F');

  // Header text with proper spacing
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text('Désignation', MARGIN_LEFT + 15, tableStartY + 28);
  doc.text('Quantité', MARGIN_LEFT + 330, tableStartY + 28, { align: 'center' });
  doc.text('Prix unit. HT', MARGIN_LEFT + 420, tableStartY + 28, { align: 'center' });
  doc.text('Total HT', MARGIN_LEFT + CONTENT_WIDTH - 15, tableStartY + 28, { align: 'right' });

  // Data row with white background
  yPos = tableStartY + headerRowHeight;
  doc.setFillColor(255, 255, 255);
  doc.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, dataRowHeight, 'F');

  setColor(doc, TEXT_DARK);
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  
  // Designation (reduced width for better spacing)
  const designationLines = doc.splitTextToSize(data.project.objet, 280);
  designationLines.forEach((line: string, index: number) => {
    doc.text(line, MARGIN_LEFT + 15, yPos + 20 + (index * 12));
  });
  
  doc.text('Forfait', MARGIN_LEFT + 330, yPos + 28, { align: 'center' });
  doc.text(formatCurrency(data.pricing.subTotalHT), MARGIN_LEFT + 420, yPos + 28, { align: 'center' });
  doc.text(formatCurrency(data.pricing.subTotalHT), MARGIN_LEFT + CONTENT_WIDTH - 15, yPos + 28, { align: 'right' });

  // Table border with rounded corners
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerRowHeight + dataRowHeight, tableRadius, tableRadius, 'S');
  doc.line(MARGIN_LEFT, tableStartY + headerRowHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerRowHeight);

  yPos += dataRowHeight + 25;

  // 7. PRICING SECTION WITH SEPARATOR (REDESIGNED - COMPACT)
  const pricingY = yPos;
  
  // Ligne bleue supérieure
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_LEFT, pricingY, MARGIN_LEFT + CONTENT_WIDTH, pricingY);

  yPos = pricingY + 12; // Réduit de 20 à 12

  // Calcul des largeurs - Prix en chiffres réduit de 10%
  const leftSectionWidth = CONTENT_WIDTH * 0.42; // Augmenté de 35% à 42%
  const separatorX = MARGIN_LEFT + leftSectionWidth;

  // Left side - Prix en lettres
  const amountInWordsLower = data.pricing.amountInWords.toLowerCase();
  const priceText = data.docType === 'DEVIS'
    ? `Veuillez arrêter le présent devis à la somme de ${amountInWordsLower}.`
    : `Veuillez arrêter la présente facture au montant de ${amountInWordsLower}, toutes taxes comprises.`;

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9.5); // Réduit de 10.5 à 9.5
  setColor(doc, BLUE_PRIMARY);
  const priceLines = doc.splitTextToSize(priceText, leftSectionWidth - 15);
  priceLines.forEach((line: string, index: number) => {
    doc.text(line, MARGIN_LEFT, yPos + (index * 11)); // Réduit de 13 à 11
  });

  // Vertical separator (ligne bleue)
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(2);
  const separatorHeight = data.docType === 'FACTURE' ? 40 : 28; // Hauteur adaptative
  doc.line(separatorX, pricingY + 5, separatorX, yPos + separatorHeight);

  // Right side - Montants (58% au lieu de 65%)
  const priceBoxX = separatorX + 15; // Réduit de 20 à 15
  const colonX = priceBoxX + 115; // Réduit de 140 à 115
  const amountX = colonX + 8; // Réduit de 10 à 8

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10); // Réduit de 11 à 10
  setColor(doc, TEXT_DARK);

  if (data.docType === 'FACTURE') {
    // HT
    doc.text('MONTANT TOTAL HT', priceBoxX, yPos + 8);
    doc.text(':', colonX, yPos + 8);
    doc.text(formatCurrency(data.pricing.subTotalHT), amountX, yPos + 8);
    
    // TVA
    doc.text('TVA (20%)', priceBoxX, yPos + 22); // Réduit espacement
    doc.text(':', colonX, yPos + 22);
    doc.text(formatCurrency(data.pricing.vatAmount), amountX, yPos + 22);
    
    // TTC
    doc.setFontSize(11); // Réduit de 12 à 11
    doc.text('TOTAL TTC', priceBoxX, yPos + 38); // Réduit espacement
    doc.text(':', colonX, yPos + 38);
    doc.text(formatCurrency(data.pricing.totalTTC), amountX, yPos + 38);
  } else {
    // DEVIS - seulement HT
    doc.setFontSize(11);
    doc.text('MONTANT TOTAL HT', priceBoxX, yPos + 18);
    doc.text(':', colonX, yPos + 18);
    doc.text(formatCurrency(data.pricing.subTotalHT), amountX, yPos + 18);
  }

  // Ligne bleue inférieure
  yPos += data.docType === 'FACTURE' ? 48 : 35; // Hauteur adaptative (réduit de 65)
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_LEFT, yPos, MARGIN_LEFT + CONTENT_WIDTH, yPos);

  yPos += 15; // Réduit de 20 à 15

  // 8. PAYMENT CONDITIONS
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text(data.payment.title, MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  data.payment.conditions.forEach((condition) => {
    doc.text(`• ${condition}`, MARGIN_LEFT + 10, yPos);
    yPos += 14;
  });

  // 9. FOOTER WITH GRADIENT
  const footerY = PAGE_HEIGHT - 110;
  
  // Gradient footer
  for (let i = 0; i < 110; i++) {
    const ratio = i / 110;
    const r = Math.floor(28 + (30 - 28) * ratio);
    const g = Math.floor(63 + (58 - 63) * ratio);
    const b = Math.floor(145 + (138 - 145) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(0, footerY + i, PAGE_WIDTH, 1, 'F');
  }

  // Left: Contact
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  doc.text('CONTACTEZ-NOUS !', MARGIN_LEFT, footerY + 25);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(8);
  doc.text('06 38 146-573', MARGIN_LEFT + 5, footerY + 45);
  doc.text('www.enarva.com', MARGIN_LEFT + 5, footerY + 60);
  doc.text('contact@enarva.com', MARGIN_LEFT + 5, footerY + 75);

  // Center: QR Code
  try {
    if (PDF_IMAGES.BARCODE) {
      const qrSize = 75;
      const qrX = (PAGE_WIDTH / 2) - (qrSize / 2);
      const qrY = footerY + 18;
      doc.addImage(PDF_IMAGES.BARCODE, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
    }
  } catch (e) {
    console.warn("QR code error:", e);
  }

  // Right: Small enarva logo text + Company info
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(16);
  doc.text('enarva', PAGE_WIDTH - MARGIN_RIGHT - 85, footerY + 22, { align: 'left' });
  
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(9);
  doc.text('Enarva SARL AU', PAGE_WIDTH - MARGIN_RIGHT, footerY + 40, { align: 'right' });

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(7);
  doc.text(`IF: ${data.company.if}  RC: ${data.company.rc}`, PAGE_WIDTH - MARGIN_RIGHT, footerY + 55, { align: 'right' });
  doc.text(`ICE: ${data.company.ice}`, PAGE_WIDTH - MARGIN_RIGHT, footerY + 67, { align: 'right' });
  doc.text(`RIB: ${data.company.rib}`, PAGE_WIDTH - MARGIN_RIGHT, footerY + 79, { align: 'right' });

  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

function renderServiceSection(
  doc: jsPDF,
  prestation: NonNullable<QuotePDFData['prestation']>,
  startY: number
): number {
  let yPos = startY;

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(doc, BLUE_PRIMARY);
  doc.text('I. PRESTATIONS INCLUSES', MARGIN_LEFT, yPos);
  yPos += 18;

  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text('1- Personnel mobilisé:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.personnelMobilise.forEach((item) => {
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text('2- Équipements & Produits Utilisés:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.equipementsUtilises.slice(0, 3).forEach((item) => {
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text('3- Détail des prestations:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.prestationsIncluses.slice(0, 3).forEach((item) => {
    const lines = doc.splitTextToSize(`• ${item}`, CONTENT_WIDTH - 20);
    lines.forEach((line: string) => {
      doc.text(line, MARGIN_LEFT + 10, yPos);
      yPos += 13;
    });
  });

  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text('4- Délai prévu de la prestation:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  doc.text(`• ${prestation.delaiPrevu}`, MARGIN_LEFT + 10, yPos);
  yPos += 20;

  return yPos;
}

function renderProductTable(
  doc: jsPDF,
  lineItems: QuotePDFData['lineItems'],
  startY: number,
  serviceType: string | null
): number {
  let yPos = startY;

  const isLinearMeter = serviceType === 'NETTOYAGE_CANAPES';

  const tableStartY = yPos;
  const headerHeight = 40;
  const rowHeight = 35;
  
  setFillColor(doc, BLUE_DARK);
  doc.rect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);

  if (isLinearMeter) {
    doc.text('Désignation', MARGIN_LEFT + 10, tableStartY + 25);
    doc.text('Quantité', MARGIN_LEFT + 220, tableStartY + 25);
    doc.text('Unité', MARGIN_LEFT + 310, tableStartY + 25);
    doc.text('Prix unit. HT', MARGIN_LEFT + 400, tableStartY + 25);
    doc.text('Total HT', MARGIN_LEFT + 490, tableStartY + 25);
  } else {
    doc.text('Désignation', MARGIN_LEFT + 10, tableStartY + 25);
    doc.text('Quantité', MARGIN_LEFT + 270, tableStartY + 25);
    doc.text('PU HT', MARGIN_LEFT + 360, tableStartY + 25);
    doc.text('Total HT', MARGIN_LEFT + 470, tableStartY + 25);
  }

  yPos += headerHeight;

  doc.setDrawColor(200, 200, 200);
  setColor(doc, TEXT_DARK);
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);

  if (lineItems) {
    lineItems.forEach((item, index) => {
      const rowY = yPos + (index * rowHeight);
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(MARGIN_LEFT, rowY, CONTENT_WIDTH, rowHeight, 'F');
      }

      if (isLinearMeter) {
        doc.text(item.description, MARGIN_LEFT + 10, rowY + 22);
        doc.text(item.quantity.toString(), MARGIN_LEFT + 220, rowY + 22);
        doc.text(item.unit || 'ml', MARGIN_LEFT + 310, rowY + 22);
        doc.text(formatCurrency(item.unitPrice), MARGIN_LEFT + 400, rowY + 22);
        doc.text(formatCurrency(item.totalPrice), MARGIN_LEFT + 490, rowY + 22);
      } else {
        const descLines = doc.splitTextToSize(item.description, 240);
        descLines.forEach((line: string, lineIndex: number) => {
          doc.text(line, MARGIN_LEFT + 10, rowY + 15 + (lineIndex * 12));
        });
        doc.text(item.quantity.toString(), MARGIN_LEFT + 270, rowY + 22);
        doc.text(formatCurrency(item.unitPrice), MARGIN_LEFT + 360, rowY + 22);
        doc.text(formatCurrency(item.totalPrice), MARGIN_LEFT + 470, rowY + 22);
      }

      doc.rect(MARGIN_LEFT, rowY, CONTENT_WIDTH, rowHeight);
    });

    yPos += (lineItems.length * rowHeight);
  }

  doc.rect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, yPos - tableStartY);

  return yPos + 10;
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

    prestationData = {
      personnelMobilise,
      equipementsUtilises: serviceConfig.equipementsUtilises || [],
      prestationsIncluses: serviceConfig.prestationsIncluses || [],
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

  let paymentConfig;
  if (docType === 'FACTURE') {
    paymentConfig = quote.businessType === 'SERVICE' 
      ? pdfContent.paymentConditions.FACTURE_SERVICE
      : (pdfContent.paymentConditions.FACTURE_PRODUIT || pdfContent.paymentConditions.FACTURE_SERVICE);
  } else {
    if (isB2B) {
      paymentConfig = quote.businessType === 'SERVICE'
        ? (pdfContent.paymentConditions.DEVIS_SERVICE_PRO || pdfContent.paymentConditions.DEVIS_SERVICE_PARTICULIER)
        : (pdfContent.paymentConditions.DEVIS_PRODUIT_PRO || pdfContent.paymentConditions.DEVIS_SERVICE_PARTICULIER);
    } else {
      paymentConfig = pdfContent.paymentConditions.DEVIS_SERVICE_PARTICULIER;
    }
  }

  const paymentConditions = [...paymentConfig.conditions];
  if (quote.purchaseOrderNumber && quote.orderedBy) {
    paymentConditions.unshift(`Commandé par: ${quote.orderedBy}`);
    paymentConditions.unshift(`Bon de commande: ${quote.purchaseOrderNumber}`);
  }

  const subTotalHT = Number(quote.subTotalHT) || Number(quote.finalPrice);
  const vatAmount = Number(quote.vatAmount) || (subTotalHT * 0.20);
  const totalTTC = docType === 'FACTURE' ? (subTotalHT + vatAmount) : subTotalHT;

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