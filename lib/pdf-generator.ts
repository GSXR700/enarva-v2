// lib/pdf-generator.ts
import jsPDF from 'jspdf';

// Type definitions for the PDF data structure
export type QuotePDFData = {
  docType: "DEVIS" | "FACTURE";
  number: string;
  date: string;
  company: {
    name: string;
    address: string[];
    ice: string;
    if: string;
    rc: string;
    rib: string;
  };
  recipient: {
    attention: string;
    addressLines: string[];
  };
  project: {
    objet: string;
  };
  prestation: {
    personnelMobilise: string[];
    equipementsUtilises: string[];
    prestationsIncluses: string[];
    delaiPrevu: string;
  };
  amountHT: string;
  amountInWords: string;
  payment: {
    conditions: string[];
    echeancier: string;
  };
};

/**
 * Generates a pixel-perfect PDF document (DEVIS or FACTURE) matching Enarva's design
 * @param data - The data object containing all content for the PDF
 * @returns Uint8Array of the generated PDF
 */
export function generateQuotePDF(data: QuotePDFData): Uint8Array {
  // Initialize jsPDF with A4 portrait dimensions
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4', // 595.28 × 841.89 pt
  });

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 40;
  const MARGIN_RIGHT = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  
  // Color definitions
  const BLUE_PRIMARY = [33, 85, 201]; // #2155C9
  const BLUE_DARK = [28, 63, 145]; // Darker blue for header
  const TEXT_DARK = [33, 33, 33];
  const TEXT_GRAY = [102, 102, 102];

  // Helper function to set colors
  const setColor = (color: number[]) => {
    doc.setTextColor(color[0], color[1], color[2]);
  };

  const setFillColor = (color: number[]) => {
    doc.setFillColor(color[0], color[1], color[2]);
  };

  // 1. HEADER SECTION WITH BLUE BACKGROUND
  setFillColor(BLUE_DARK);
  doc.rect(0, 0, PAGE_WIDTH, 100, 'F');
  
  // DEVIS title (left side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(255, 255, 255);
  doc.text(data.docType, MARGIN_LEFT, 60);
  
  // Date and Number below DEVIS
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Date: ${data.date}`, MARGIN_LEFT, 80);
  doc.text(`N° ${data.number}`, MARGIN_LEFT + 120, 80);
  
  // Enarva logo/text (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(36);
  doc.text('enarva', PAGE_WIDTH - MARGIN_RIGHT - 120, 60);

  // 2. COMPANY AND RECIPIENT INFORMATION
  let yPos = 130;
  
  // Left side - Company info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(TEXT_DARK);
  doc.text(data.company.name, MARGIN_LEFT, yPos);
  
  yPos += 20;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  data.company.address.forEach(line => {
    doc.text(line, MARGIN_LEFT, yPos);
    yPos += 14;
  });
  
  // Right side - Recipient
  yPos = 130;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`À l'attention de ${data.recipient.attention}`, PAGE_WIDTH - 250, yPos);
  
  yPos += 20;
  doc.setFontSize(10);
  data.recipient.addressLines.forEach(line => {
    doc.text(line, PAGE_WIDTH - 250, yPos);
    yPos += 14;
  });

  // 3. OBJET SECTION WITH BLUE BACKGROUND
  yPos = 220;
  setFillColor(BLUE_PRIMARY);
  doc.roundedRect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 40, 8, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(`OBJET: ${data.project.objet}`, MARGIN_LEFT + 20, yPos + 25);

  // 4. DÉTAILS DE LA PRESTATION
  yPos = 280;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  setColor(BLUE_PRIMARY);
  doc.text('DÉTAILS DE LA PRESTATION:', MARGIN_LEFT, yPos);
  
  // Personnel mobilisé
  yPos += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(BLUE_PRIMARY);
  doc.text('Personnel mobilisé:', MARGIN_LEFT, yPos);
  
  yPos += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(TEXT_DARK);
  data.prestation.personnelMobilise.forEach(item => {
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 14;
  });

  // Équipements et produits utilisés
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(BLUE_PRIMARY);
  doc.text('Équipements et produits utilisés:', MARGIN_LEFT, yPos);
  
  yPos += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(TEXT_DARK);
  data.prestation.equipementsUtilises.forEach(item => {
    // Handle long text with word wrap
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 20);
    lines.forEach((line: string) => {
      doc.text(line.startsWith('•') ? line : `• ${line}`, MARGIN_LEFT + 10, yPos);
      yPos += 14;
    });
  });

  // Prestations incluses
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(BLUE_PRIMARY);
  doc.text('Prestations incluses:', MARGIN_LEFT, yPos);
  
  yPos += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(TEXT_DARK);
  data.prestation.prestationsIncluses.forEach(item => {
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 20);
    lines.forEach((line: string) => {
      doc.text(line.startsWith('•') ? line : `• ${line}`, MARGIN_LEFT + 10, yPos);
      yPos += 14;
    });
  });

  // Délai prévu
  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  setColor(BLUE_PRIMARY);
  doc.text('Délai prévu de la prestation:', MARGIN_LEFT, yPos);
  
  yPos += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  setColor(TEXT_DARK);
  doc.text(`• ${data.prestation.delaiPrevu}`, MARGIN_LEFT + 10, yPos);

  // 5. AMOUNT BOX
  yPos += 40;
  
  // Draw border box for amount
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(1);
  doc.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 80, 'S');
  
  // Amount text
  yPos += 25;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  setColor(TEXT_DARK);
  doc.text('Veuillezarrêter le présent devis', MARGIN_LEFT + 15, yPos);
  
  yPos += 16;
  doc.text(`à la somme de ${data.amountInWords}`, MARGIN_LEFT + 15, yPos);
  
  // Amount value (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  setColor(BLUE_PRIMARY);
  doc.text(`FORFAIT TOTAL HT: ${data.amountHT}`, PAGE_WIDTH - MARGIN_RIGHT - 200, yPos - 8);

  // 6. PAYMENT CONDITIONS
  yPos += 50;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(TEXT_DARK);
  doc.text('Conditions de paiement :', MARGIN_LEFT, yPos);
  
  yPos += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  data.payment.conditions.forEach(condition => {
    doc.text(`• ${condition}`, MARGIN_LEFT + 10, yPos);
    yPos += 14;
  });
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Échelonnement du Paiement:', MARGIN_LEFT, yPos);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(data.payment.echeancier, MARGIN_LEFT + 150, yPos);

  // 7. FOOTER SECTION WITH BLUE BACKGROUND
  const footerY = PAGE_HEIGHT - 120;
  
  setFillColor(BLUE_DARK);
  doc.rect(0, footerY, PAGE_WIDTH, 120, 'F');
  
  // Contact section
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CONTACTEZ-NOUS !', MARGIN_LEFT, footerY + 30);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('06 38 146-573', MARGIN_LEFT + 20, footerY + 50);
  doc.text('www.enarva.com', MARGIN_LEFT + 20, footerY + 65);
  doc.text('contact@enarva.com', MARGIN_LEFT + 20, footerY + 80);
  
  // Company details (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Enarva SARL AU', PAGE_WIDTH - 200, footerY + 30);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`IF: ${data.company.if}   RC: ${data.company.rc}`, PAGE_WIDTH - 200, footerY + 50);
  doc.text(`ICE: ${data.company.ice}`, PAGE_WIDTH - 200, footerY + 65);
  doc.text(`RIB: ${data.company.rib}`, PAGE_WIDTH - 200, footerY + 80);

  // ** FIX: Correctly convert ArrayBuffer to Uint8Array **
  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

// Helper function to prepare data from database Quote to PDF format
export function prepareQuotePDFData(
  quote: any, // Your Quote type with relations
  docType: 'DEVIS' | 'FACTURE' = 'DEVIS'
): QuotePDFData {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Extract services from quote line items
  const prestationsIncluses = quote.lineItems?.map((item: any) => {
    if (item.description?.toLowerCase().includes('nettoyage')) {
      return item.description;
    }
    return null;
  }).filter(Boolean) || [
    'Nettoyage et dépoussiérage des plafonds, placards, façades, des rideaux et des embrasures.',
    'Nettoyage ciblé des résidus sur toutes les surfaces (murs, sols, vitres, plinthes).',
    'Nettoyage des interrupteurs, prises, poignées et rampes.',
    'Détartrage et désinfection des sanitaires (lavabos, douches, WC, baignoires).',
    'Nettoyage de cuisine : placards, plan de travail, crédences, électroménagers encastrés.',
    'Nettoyage complet des vitres et encadrement avec enlèvement des traces de chantier.',
    'Entretien et traitement des sols en fonction de leur type.'
  ];

  return {
    docType,
    number: quote.quoteNumber.replace('Q-', '').replace('DEV-', ''),
    date: today,
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
      attention: quote.lead.leadType === 'PARTICULIER' 
        ? `${quote.lead.firstName} ${quote.lead.lastName}`
        : `Madame la propriétaire`,
      addressLines: [
        quote.lead.address || 'Hay Riad',
        'Rabat - Maroc'
      ]
    },
    project: {
      objet: `Nettoyage profond d'un ${getPropertyTypeLabel(quote.propertyType)} d'environ ${quote.surface || 170} m²`
    },
    prestation: {
      personnelMobilise: [
        '1 Superviseur',
        `${Math.ceil((quote.surface || 170) / 50)} agents de nettoyage.`,
        '1 techniciens vitriers pour les vitres et les zones d\'accès difficile.'
      ],
      equipementsUtilises: [
        'Aspirateur industriel pour poussière et collecte de l\'eau usée.',
        'Générateur de vapeur Emilio RA Plus pour la désinfection et les taches tenaces.',
        'Échelles selon les besoins spécifiques pour les vitres et volets roulants extérieurs.',
        'Détergent pour les surfaces carrelées.',
        'Dégraissant (pH neutre) pour les surfaces en marbre.',
        'Nettoyant pour les surfaces en bois.',
        'Produits et matériel de nettoyage des vitres.',
        'Détergent et polish certifiés pour les surfaces métalliques.',
        'Outils généraux de ménage.'
      ],
      prestationsIncluses,
      delaiPrevu: '1 jours ouvrable'
    },
    amountHT: formatCurrency(Number(quote.finalPrice)),
    amountInWords: numberToFrenchWords(Number(quote.finalPrice)),
    payment: {
      conditions: [
        'Les règlements peuvent être effectués par virement bancaire ou en espèces.'
      ],
      echeancier: '100 % à la livraison.'
    }
  };
}

// Utility functions
function getPropertyTypeLabel(propertyType: string | null): string {
  const labels: { [key: string]: string } = {
    'APARTMENT_SMALL': 'appartement',
    'APARTMENT_MEDIUM': 'appartement',
    'APARTMENT_MULTI': 'appartement',
    'VILLA_LARGE': 'villa',
    'COMMERCIAL': 'local commercial',
    'HOTEL_STANDARD': 'hôtel',
    'HOTEL_LUXURY': 'hôtel de luxe',
    'OFFICE': 'bureau',
    'RESIDENCE_B2B': 'résidence',
    'RESTAURANT': 'restaurant'
  };
  return labels[propertyType || ''] || 'appartement';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' MAD';
}

function numberToFrenchWords(amount: number): string {
  // Simplified French number to words conversion
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];
  
  if (amount >= 1000) {
    const thousands = Math.floor(amount / 1000);
    const remainder = amount % 1000;
    let result = '';
    
    if (thousands === 1) {
      result = 'mille';
    } else {
      result = `${units[thousands]} mille`;
    }
    
    if (remainder > 0) {
      if (remainder >= 100) {
        const hundreds = Math.floor(remainder / 100);
        const rest = remainder % 100;
        result += hundreds === 1 ? ' cent' : ` ${units[hundreds]} cents`;
        if (rest > 0) {
          result += ` ${numberToFrenchWords(rest).replace(' dirhams', '')}`;
        }
      } else {
        result += ` ${numberToFrenchWords(remainder).replace(' dirhams', '')}`;
      }
    }
    
    return result.trim() + ' dirhams';
  }
  
  if (amount >= 100) {
    const hundreds = Math.floor(amount / 100);
    const remainder = amount % 100;
    let result = hundreds === 1 ? 'cent' : `${units[hundreds]} cents`;
    if (remainder > 0) {
      result += ` ${numberToFrenchWords(remainder).replace(' dirhams', '')}`;
    }
    return result + ' dirhams';
  }
  
  if (amount >= 20) {
    const ten = Math.floor(amount / 10);
    const unit = amount % 10;
    return `${tens[ten]}${unit > 0 ? ` ${units[unit]}` : ''} dirhams`;
  }
  
  if (amount >= 10) {
    const teenWords = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    return teenWords[amount - 10] + ' dirhams';
  }
  
  return (units[amount] || 'zéro') + ' dirhams';
}

// Export the main function
export default generateQuotePDF;