// lib/pdf-generator.ts - ENHANCED MODULAR PDF GENERATOR WITH IMAGES
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

  // 4. OBJET SECTION - UNIQUEMENT POUR LES SERVICES
  if (data.project.businessType === 'SERVICE') {
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
  }

  // 5. CONTENT SECTION
  if (data.project.businessType === 'SERVICE' && data.prestation) {
    yPos = renderServiceSection(doc, data.prestation, yPos);
  } else if (data.lineItems) {
    yPos = renderProductTable(doc, data.lineItems, yPos, data.project.serviceType);
  }

  // 6. TABLEAU FORFAIT - UNIQUEMENT POUR LES SERVICES
  if (data.project.businessType === 'SERVICE') {
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

    // Header text with proper spacing - COLONNES OPTIMALES
    doc.setTextColor(255, 255, 255);
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    doc.text('Désignation', MARGIN_LEFT + 15, tableStartY + 28);
    doc.text('Quantité', MARGIN_LEFT + 300, tableStartY + 28, { align: 'center' });
    doc.text('Prix unit. HT', MARGIN_LEFT + 395, tableStartY + 28, { align: 'center' });
    doc.text('Total HT', MARGIN_LEFT + CONTENT_WIDTH - 15, tableStartY + 28, { align: 'right' });

    // Data row with white background
    yPos = tableStartY + headerRowHeight;
    doc.setFillColor(255, 255, 255);
    doc.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, dataRowHeight, 'F');

    setColor(doc, TEXT_DARK);
    doc.setFont('Poppins', 'normal');
    doc.setFontSize(9);
    
    // Designation (width réduit à 220px + centré verticalement)
    const designationLines = doc.splitTextToSize(data.project.objet, 220);
    const designationHeight = designationLines.length * 12;
    const designationStartY = yPos + (dataRowHeight - designationHeight) / 2 + 10;
    
    designationLines.forEach((line: string, index: number) => {
      doc.text(line, MARGIN_LEFT + 15, designationStartY + (index * 12));
    });
    
    // Autres colonnes (centrées verticalement)
    doc.text('Forfait', MARGIN_LEFT + 300, yPos + 28, { align: 'center' });
    doc.text(formatCurrency(data.pricing.subTotalHT), MARGIN_LEFT + 395, yPos + 28, { align: 'center' });
    doc.text(formatCurrency(data.pricing.subTotalHT), MARGIN_LEFT + CONTENT_WIDTH - 15, yPos + 28, { align: 'right' });

    // Table border with rounded corners
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1.5);
    doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerRowHeight + dataRowHeight, tableRadius, tableRadius, 'S');
    doc.line(MARGIN_LEFT, tableStartY + headerRowHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerRowHeight);

    yPos += dataRowHeight + 25;
  }

  // 7. PRICING SECTION WITH SEPARATOR (50/50 SPLIT + PROFESSIONAL DESIGN)
  const pricingY = yPos;
  
  // Ligne bleue supérieure
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_LEFT, pricingY, MARGIN_LEFT + CONTENT_WIDTH, pricingY);

  yPos = pricingY + 15;

  // 50% / 50% split
  const leftSectionWidth = CONTENT_WIDTH * 0.50; // 50% pour le texte en lettres
  const separatorX = MARGIN_LEFT + leftSectionWidth;

  // Left side - Prix en lettres (50%)
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

  // Vertical separator (ligne bleue)
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(2.5);
  const separatorHeight = data.docType === 'FACTURE' ? 50 : 32;
  doc.line(separatorX, pricingY + 5, separatorX, yPos + separatorHeight);

  // Right side - Montants avec design professionnel (50%)
  const priceBoxX = separatorX + 25;

  if (data.docType === 'FACTURE') {
    // FACTURE - 3 lignes (HT, TVA, TTC)
    
    // Ligne 1: MONTANT TOTAL HT
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    setColor(doc, TEXT_DARK);
    doc.text('MONTANT TOTAL HT', priceBoxX, yPos + 10);
    
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    doc.text(':', priceBoxX + 125, yPos + 10);
    doc.text(formatCurrency(data.pricing.subTotalHT), priceBoxX + 135, yPos + 10);
    
    // Ligne 2: TVA
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(10);
    doc.text('TVA (20%)', priceBoxX, yPos + 26);
    doc.text(':', priceBoxX + 125, yPos + 26);
    doc.text(formatCurrency(data.pricing.vatAmount), priceBoxX + 135, yPos + 26);
    
    // Ligne 3: TOTAL TTC (plus visible)
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL TTC', priceBoxX, yPos + 45);
    doc.text(':', priceBoxX + 125, yPos + 45);
    doc.text(formatCurrency(data.pricing.totalTTC), priceBoxX + 135, yPos + 45);
    
  } else {
    // DEVIS - Une seule ligne centrée verticalement
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(12);
    setColor(doc, TEXT_DARK);
    
    doc.text('MONTANT TOTAL HT', priceBoxX, yPos + 20);
    doc.text(':', priceBoxX + 135, yPos + 20);
    doc.text(formatCurrency(data.pricing.subTotalHT), priceBoxX + 145, yPos + 20);
  }

  // Ligne bleue inférieure
  yPos += data.docType === 'FACTURE' ? 58 : 42;
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  doc.line(MARGIN_LEFT, yPos, MARGIN_LEFT + CONTENT_WIDTH, yPos);

  yPos += 18;

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

  // 9. FOOTER - AVEC MARGES ET BORDER RADIUS (DESIGN PREMIUM)
  const footerHeight = 85;
  const footerY = PAGE_HEIGHT - footerHeight;
  const footerRadius = 12;
  
  // Fond bleu avec marges gauche/droite + border radius en haut uniquement
  doc.setFillColor(30, 58, 138);
  
  // Rectangle avec coins arrondis en haut
  doc.roundedRect(MARGIN_LEFT, footerY, CONTENT_WIDTH, footerHeight, footerRadius, footerRadius, 'F');
  
  // Couvrir les coins arrondis du BAS pour les rendre carrés
  doc.rect(MARGIN_LEFT, footerY + footerHeight - footerRadius, CONTENT_WIDTH, footerRadius, 'F');

  // ========== LEFT SECTION: MISE EN PAGE PROFESSIONNELLE ==========
  const textStartX = MARGIN_LEFT + 15; // Marge intérieure de 15pt depuis le bord gauche
  const topMargin = 18; // Marge du haut
  
  doc.setTextColor(255, 255, 255);
  
  // Ligne 1: LOGO "enarva" + "sarl au" sur la MÊME ligne
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(22);
  doc.text('enarva', textStartX, footerY + 28);
  
  const enarvaWidth = doc.getTextWidth('enarva');
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text('sarl au', textStartX + enarvaWidth + 6, footerY + 28); // 6pt d'espace

  // Ligne 2: Adresse (marge de 8pt après ligne 1)
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(8);
  doc.text(
    '53, 2ème étage, Appartement 15,  Avenue Brahim Roudani - Océan, Rabat - Maroc',
    textStartX,
    footerY + topMargin + 28
  );

  // Ligne 3: Contact (marge de 11pt après ligne 2)
  doc.text(
    'Téléphone : 06 38 146-573 • Site web : www.enarva.com • e-mail : contact@enarva.com',
    textStartX,
    footerY + topMargin + 41
  );

  // Ligne 4: Informations légales (marge de 11pt après ligne 3)
  doc.text(
    `IF : ${data.company.if} • RC : ${data.company.rc} • ICE : ${data.company.ice} • RIB : ${data.company.rib}`,
    textStartX,
    footerY + topMargin + 54
  );

  // ========== RIGHT SECTION: QR CODE (CENTRÉ VERTICALEMENT) ==========
  try {
    if (PDF_IMAGES.BARCODE) {
      const qrSize = 70;
      const qrX = MARGIN_LEFT + CONTENT_WIDTH - qrSize - 15; // 15pt de marge intérieure droite
      const qrY = footerY + (footerHeight - qrSize) / 2;
      
      doc.addImage(PDF_IMAGES.BARCODE, 'PNG', qrX, qrY, qrSize, qrSize, undefined, 'FAST');
    }
  } catch (e) {
    console.warn("QR code error:", e);
  }

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
  const headerHeight = 45;
  const rowHeight = 35;
  const tableRadius = 8;
  
  // Header avec gradient et border radius (coins arrondis en haut)
  doc.setFillColor(30, 58, 138);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerHeight, tableRadius, tableRadius, 'F');
  
  // Couvrir les coins arrondis du bas pour les rendre carrés
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
      const rowY = yPos + (index * rowHeight);
      
      // Alternance de couleurs pour les lignes
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

      // Bordure de ligne
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      if (index < lineItems.length - 1) {
        doc.line(MARGIN_LEFT, rowY + rowHeight, MARGIN_LEFT + CONTENT_WIDTH, rowY + rowHeight);
      }
    });

    yPos += (lineItems.length * rowHeight);
  }

  // Bordure extérieure du tableau avec border radius
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(1.5);
  const totalTableHeight = headerHeight + (lineItems ? lineItems.length * rowHeight : 0);
  doc.roundedRect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, totalTableHeight, tableRadius, tableRadius, 'S');
  
  // Ligne séparatrice entre header et contenu
  doc.line(MARGIN_LEFT, tableStartY + headerHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerHeight);

  return yPos + 10;
}

export function prepareQuotePDFData(
  quote: any,docType: 'DEVIS' | 'FACTURE' = 'DEVIS'
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