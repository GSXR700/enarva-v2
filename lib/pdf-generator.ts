// lib/pdf-generator.ts - ENHANCED MODULAR PDF GENERATOR
import jsPDF from 'jspdf';
import { poppinsNormal, poppinsBold } from './fonts';
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
 * Generates a pixel-perfect PDF document matching Enarva's design
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

  let yPos = 0;

  // 1. HEADER SECTION (BLUE BACKGROUND)
  setFillColor(doc, BLUE_DARK);
  doc.rect(0, 0, PAGE_WIDTH, 120, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(36);
  doc.text(data.docType, MARGIN_LEFT, 50);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(12);
  doc.text(`Date: ${data.date}`, MARGIN_LEFT, 80);
  doc.text(`N ° ${data.number}`, MARGIN_LEFT, 100);

  // Logo placeholder (right side)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(24);
  doc.text('enarva', PAGE_WIDTH - 150, 60);
  doc.setFontSize(8);
  doc.setFont('Poppins', 'normal');
  doc.text('Premium home &', PAGE_WIDTH - 150, 80);
  doc.text('facility care', PAGE_WIDTH - 150, 92);

  yPos = 150;

  // 2. COMPANY AND CLIENT INFO (TWO COLUMNS)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(doc, TEXT_DARK);
  doc.text(data.company.name, MARGIN_LEFT, yPos);

  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  yPos += 15;
  data.company.address.forEach((line) => {
    doc.text(line, MARGIN_LEFT, yPos);
    yPos += 12;
  });

  // Client info (right aligned)
  let clientYPos = 150;

  if (data.recipient.isB2B) {
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(11);
    doc.text(data.recipient.attention.toUpperCase(), PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
  } else {
    doc.setFont('Poppins', 'bold');
    doc.setFontSize(11);
    doc.text(`À l'attention de ${data.recipient.attention}`, PAGE_WIDTH - MARGIN_RIGHT, clientYPos, { align: 'right' });
  }

  clientYPos += 15;
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

  // 4. PROJECT OBJECT
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(12);
  setColor(doc, BLUE_PRIMARY);
  setFillColor(doc, [240, 245, 255] as const);
  doc.roundedRect(MARGIN_LEFT - 10, yPos - 15, CONTENT_WIDTH + 20, 35, 3, 3, 'F');
  
  doc.text(`OBJET : ${data.project.objet}`, MARGIN_LEFT, yPos);
  yPos += 40;

  // 5. CONTENT SECTION
  if (data.project.businessType === 'SERVICE' && data.prestation) {
    yPos = renderServiceSection(doc, data.prestation, yPos, data.project.objet, data.pricing.subTotalHT);
  } else if (data.lineItems) {
    yPos = renderProductTable(doc, data.lineItems, yPos, data.project.serviceType);
  }

  // 6. PRICING SECTION
  yPos += 20;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, BLUE_PRIMARY);
  
  const pricingText = data.docType === 'DEVIS' 
    ? `Veuillez arrêter le présent devis à la somme de ${data.pricing.amountInWords}.`
    : `Arrête la présente facture à la somme de ${data.pricing.amountInWords}, toutes taxes comprises.`;
  
  const pricingLines = doc.splitTextToSize(pricingText, CONTENT_WIDTH - 220);
  pricingLines.forEach((line: string) => {
    doc.text(line, MARGIN_LEFT, yPos);
    yPos += 12;
  });

  // Amount box (right side)
  const amountBoxX = PAGE_WIDTH - MARGIN_RIGHT - 180;
  const amountBoxY = yPos - (pricingLines.length * 12) - 10;
  
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, TEXT_DARK);
  doc.text(`MONTANT TOTAL HT :`, amountBoxX, amountBoxY);
  doc.text(formatCurrency(data.pricing.subTotalHT), amountBoxX + 150, amountBoxY, { align: 'right' });
  
  if (data.docType === 'FACTURE') {
    doc.text(`TVA (20%) :`, amountBoxX, amountBoxY + 15);
    doc.text(formatCurrency(data.pricing.vatAmount), amountBoxX + 150, amountBoxY + 15, { align: 'right' });
    
    doc.text(`TOTAL TTC :`, amountBoxX, amountBoxY + 30);
    doc.text(formatCurrency(data.pricing.totalTTC), amountBoxX + 150, amountBoxY + 30, { align: 'right' });
  }

  yPos += 25;

  // 7. PAYMENT CONDITIONS
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(doc, BLUE_PRIMARY);
  doc.text(data.payment.title, MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  data.payment.conditions.forEach((condition) => {
    const lines = doc.splitTextToSize(`• ${condition}`, CONTENT_WIDTH - 10);
    lines.forEach((line: string) => {
      doc.text(line, MARGIN_LEFT + 10, yPos);
      yPos += 13;
    });
  });

  // 8. FOOTER SECTION (BLUE BACKGROUND)
  const footerY = PAGE_HEIGHT - 120;
  
  setFillColor(doc, BLUE_DARK);
  doc.rect(0, footerY, PAGE_WIDTH, 120, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(12);
  doc.text('CONTACTEZ-NOUS !', MARGIN_LEFT, footerY + 25);
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text('06 38 146-573', MARGIN_LEFT + 20, footerY + 45);
  doc.text('www.enarva.com', MARGIN_LEFT + 20, footerY + 60);
  doc.text('contact@enarva.com', MARGIN_LEFT + 20, footerY + 75);

  // QR Code / Barcode image in the center
  try {
    const barcodeX = (PAGE_WIDTH / 2) - 40;
    // Placeholder for barcode image
    // To add the actual image, uncomment:
    // doc.addImage('/images/dark-mobile.png', 'PNG', barcodeX, footerY + 15, 80, 80);
    doc.setFontSize(8);
    doc.text('QR Code', barcodeX + 30, footerY + 55);
  } catch (e) {
    console.warn("Could not add barcode image:", e);
  }
  
  // Company details (right side)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  doc.text('Enarva SARL AU', PAGE_WIDTH - 200, footerY + 25);
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(8);
  doc.text(`IF: ${data.company.if}  RC: ${data.company.rc}`, PAGE_WIDTH - 200, footerY + 45);
  doc.text(`ICE: ${data.company.ice}`, PAGE_WIDTH - 200, footerY + 60);
  doc.text(`RIB: ${data.company.rib}`, PAGE_WIDTH - 200, footerY + 75);

  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

function renderServiceSection(
  doc: jsPDF,
  prestation: NonNullable<QuotePDFData['prestation']>,
  startY: number,
  serviceDescription: string,
  totalHT: number
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
  doc.text('2- Équipements & Produits Utilisés:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.equipementsUtilises.forEach((item) => {
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
  doc.text('3- Détail des prestations:', MARGIN_LEFT, yPos);
  yPos += 14;
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(doc, TEXT_DARK);
  prestation.prestationsIncluses.forEach((item) => {
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

  yPos = renderServiceTable(doc, yPos, serviceDescription, totalHT);

  return yPos;
}

function renderServiceTable(doc: jsPDF, startY: number, serviceDescription: string, totalHT: number): number {
  let yPos = startY;

  const tableStartY = yPos;
  const headerHeight = 35;
  const rowHeight = 40;
  
  setFillColor(doc, BLUE_DARK);
  doc.rect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerHeight, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  
  doc.text('Désignation', MARGIN_LEFT + 10, tableStartY + 22);
  doc.text('Quantité', MARGIN_LEFT + 300, tableStartY + 22);
  doc.text('Prix unit. HT', MARGIN_LEFT + 380, tableStartY + 22);
  doc.text('Total HT', MARGIN_LEFT + 480, tableStartY + 22);

  yPos += headerHeight;

  setColor(doc, TEXT_DARK);
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  
  const descLines = doc.splitTextToSize(serviceDescription, 280);
  descLines.forEach((line: string, index: number) => {
    doc.text(line, MARGIN_LEFT + 10, yPos + 15 + (index * 12));
  });
  
  doc.text('Forfait', MARGIN_LEFT + 300, yPos + 22);
  doc.text(formatCurrency(totalHT), MARGIN_LEFT + 380, yPos + 22);
  doc.text(formatCurrency(totalHT), MARGIN_LEFT + 480, yPos + 22);
  
  doc.setDrawColor(200, 200, 200);
  doc.rect(MARGIN_LEFT, tableStartY, CONTENT_WIDTH, headerHeight + rowHeight);
  doc.line(MARGIN_LEFT, tableStartY + headerHeight, MARGIN_LEFT + CONTENT_WIDTH, tableStartY + headerHeight);

  return yPos + rowHeight + 10;
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