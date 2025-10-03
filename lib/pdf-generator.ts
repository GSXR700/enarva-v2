// lib/pdf-generator.ts - ENHANCED WITH B2B AND PURCHASE ORDER SUPPORT
import jsPDF from 'jspdf';
import { poppinsNormal, poppinsBold } from './fonts';

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

  // Load Poppins fonts
  try {
    doc.addFileToVFS('Poppins-Regular.ttf', poppinsNormal);
    doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
    doc.addFileToVFS('Poppins-Bold.ttf', poppinsBold);
    doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
  } catch(e) { 
    console.warn("Erreur lors du chargement des polices Poppins, utilisation de Helvetica:", e);
  }

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;
  const MARGIN_LEFT = 40;
  const MARGIN_RIGHT = 40;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
  
  // Color definitions
  const BLUE_PRIMARY = [30, 58, 138]; // Bleu marine Enarva
  const BLUE_DARK = [28, 63, 145];
  const TEXT_DARK = [33, 33, 33];

  // Helper function to set colors
  const setColor = (color: number[]) => {
    if (color.length >= 3 && typeof color[0] === 'number' && typeof color[1] === 'number' && typeof color[2] === 'number') {
      doc.setTextColor(color[0], color[1], color[2]);
    }
  };

  const setFillColor = (color: number[]) => {
    if (color.length >= 3 && typeof color[0] === 'number' && typeof color[1] === 'number' && typeof color[2] === 'number') {
      doc.setFillColor(color[0], color[1], color[2]);
    }
  };

  // 1. HEADER SECTION WITH BLUE BACKGROUND
  setFillColor(BLUE_DARK);
  doc.rect(0, 0, PAGE_WIDTH, 100, 'F');
  
  // DEVIS title (left side)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(48);
  doc.setTextColor(255, 255, 255);
  doc.text(data.docType, MARGIN_LEFT, 60);
  
  // Date and Number below DEVIS
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  doc.text(`Date:${data.date}`, MARGIN_LEFT, 80);
  doc.text(`N° ${data.number}`, MARGIN_LEFT + 120, 80);
  
  // Enarva logo/text (right side)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(36);
  doc.text('enarva', PAGE_WIDTH - MARGIN_RIGHT - 120, 60);

  // 2. COMPANY AND RECIPIENT INFORMATION
  let yPos = 130;
  
  // Left side - Company info
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(TEXT_DARK);
  doc.text(data.company.name, MARGIN_LEFT, yPos);
  
  yPos += 20;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  data.company.address.forEach(line => {
    doc.text(line, MARGIN_LEFT, yPos);
    yPos += 14;
  });
  
  // Right side - Recipient
  yPos = 130;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  doc.text(`À l'attention de ${data.recipient.attention}`, PAGE_WIDTH - 250, yPos);
  
  yPos += 20;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  data.recipient.addressLines.forEach(line => {
    doc.text(line, PAGE_WIDTH - 250, yPos);
    yPos += 14;
  });

  // 3. OBJET SECTION WITH BLUE ROUNDED BACKGROUND
  yPos = 220;
  setFillColor(BLUE_PRIMARY);
  doc.roundedRect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 40, 8, 8, 'F');
  
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(data.project.objet, MARGIN_LEFT + 20, yPos + 25);

  // 4. DÉTAILS DE LA PRESTATION
  yPos = 280;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  setColor(BLUE_PRIMARY);
  doc.text('I. PRESTATIONS INCLUSES', MARGIN_LEFT, yPos);
  
  // Personnel mobilisé
  yPos += 25;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(BLUE_PRIMARY);
  doc.text('Personnel mobilisé:', MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(TEXT_DARK);
  data.prestation.personnelMobilise.forEach(item => {
    doc.text(`• ${item}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });

  // Équipements et produits utilisés
  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(BLUE_PRIMARY);
  doc.text('Équipements&Produits Utilisés', MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(TEXT_DARK);
  data.prestation.equipementsUtilises.forEach(item => {
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 20);
    lines.forEach((line: string) => {
      doc.text(line.startsWith('•') ? line : `• ${line}`, MARGIN_LEFT + 10, yPos);
      yPos += 13;
    });
  });

  // Prestations incluses
  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(BLUE_PRIMARY);
  doc.text('Prestations incluses:', MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(TEXT_DARK);
  data.prestation.prestationsIncluses.forEach(item => {
    const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 20);
    lines.forEach((line: string) => {
      doc.text(line.startsWith('•') ? line : `• ${line}`, MARGIN_LEFT + 10, yPos);
      yPos += 13;
    });
  });

  // Délai prévu
  yPos += 8;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(BLUE_PRIMARY);
  doc.text('Délai prévu de la prestation:', MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(TEXT_DARK);
  doc.text(`• ${data.prestation.delaiPrevu}`, MARGIN_LEFT + 10, yPos);

  // 5. AMOUNT BOX
  yPos += 35;
  
  // Amount text in blue box
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(BLUE_PRIMARY);
  const amountTextLines = doc.splitTextToSize(`Veuillez arrêter le présent devis à la somme de ${data.amountInWords}.`, CONTENT_WIDTH - 220);
  amountTextLines.forEach((line: string) => {
    doc.text(line, MARGIN_LEFT, yPos);
    yPos += 12;
  });
  
  // Amount value (right side)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(12);
  setColor(TEXT_DARK);
  doc.text(`TOTAL HT:${data.amountHT}`, PAGE_WIDTH - MARGIN_RIGHT, yPos - 15, { align: 'right' });

  // 6. PAYMENT CONDITIONS
  yPos += 25;
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(10);
  setColor(BLUE_PRIMARY);
  doc.text('Conditions de paiement :', MARGIN_LEFT, yPos);
  
  yPos += 16;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  setColor(TEXT_DARK);
  data.payment.conditions.forEach(condition => {
    doc.text(`• ${condition}`, MARGIN_LEFT + 10, yPos);
    yPos += 13;
  });
  
  yPos += 5;
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text(`Échelonnement du Paiement: ${data.payment.echeancier}`, MARGIN_LEFT + 10, yPos);

  // 7. FOOTER SECTION WITH BLUE BACKGROUND
  const footerY = PAGE_HEIGHT - 120;
  
  setFillColor(BLUE_DARK);
  doc.rect(0, footerY, PAGE_WIDTH, 120, 'F');
  
  // Contact section
  doc.setTextColor(255, 255, 255);
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(12);
  doc.text('CONTACTEZ-NOUS !', MARGIN_LEFT, footerY + 25);
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(9);
  doc.text('06 38 146-573', MARGIN_LEFT + 20, footerY + 45);
  doc.text('www.enarva.com', MARGIN_LEFT + 20, footerY + 60);
  doc.text('contact@enarva.com', MARGIN_LEFT + 20, footerY + 75);
  
  // Company details (right side)
  doc.setFont('Poppins', 'bold');
  doc.setFontSize(11);
  doc.text('Enarva SARL AU', PAGE_WIDTH - 200, footerY + 25);
  
  doc.setFont('Poppins', 'normal');
  doc.setFontSize(8);
  doc.text(`IF: ${data.company.if}  RC: ${data.company.rc}`, PAGE_WIDTH - 200, footerY + 45);
  doc.text(`ICE: ${data.company.ice}`, PAGE_WIDTH - 200, footerY + 60);
  doc.text(`RIB: ${data.company.rib}`, PAGE_WIDTH - 200, footerY + 75);

  // Convert ArrayBuffer to Uint8Array for return
  const buffer = doc.output('arraybuffer');
  return new Uint8Array(buffer);
}

// ENHANCED: Helper function to prepare data from database Quote to PDF format with B2B support
export function prepareQuotePDFData(
  quote: any,
  docType: 'DEVIS' | 'FACTURE' = 'DEVIS'
): QuotePDFData {
  const today = new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  // Extract purchase order information if present
  const hasPurchaseOrder = quote.purchaseOrderNumber && quote.orderedBy;

  // Build recipient information with B2B support
  let recipientAttention = '';
  let recipientAddressLines: string[] = [];

  if (quote.lead.leadType === 'PARTICULIER') {
    // Individual client
    recipientAttention = `${quote.lead.firstName} ${quote.lead.lastName}`;
    recipientAddressLines = [
      quote.lead.address || 'Adresse non spécifiée',
      'Maroc'
    ];
  } else {
    // B2B client
    recipientAttention = quote.lead.company || 'Entreprise';
    
    // Add contact person if available
    if (quote.lead.firstName && quote.lead.lastName) {
      recipientAttention += ` - ${quote.lead.firstName} ${quote.lead.lastName}`;
    }
    
    // Add position if available
    if (quote.lead.contactPosition) {
      recipientAttention += ` (${quote.lead.contactPosition})`;
    }

    recipientAddressLines = [
      quote.lead.address || 'Adresse non spécifiée',
      'Maroc'
    ];

    // Add ICE number if available
    if (quote.lead.iceNumber) {
      recipientAddressLines.push(`ICE: ${quote.lead.iceNumber}`);
    }

    // Add activity sector if available
    if (quote.lead.activitySector) {
      recipientAddressLines.push(`Secteur: ${quote.lead.activitySector}`);
    }
  }

  // Build project object line - enhanced for products with purchase order
  let projectObjet = '';
  
  if (quote.businessType === 'SERVICE') {
    const propertyLabel = getPropertyTypeLabel(quote.propertyType);
    const surface = quote.surface || 170;
    projectObjet = `Nettoyage profond d'un ${propertyLabel} d'environ ${surface} m²`;
  } else {
    // Product quote
    projectObjet = `Fourniture de produits`;
    
    if (quote.productCategory) {
      projectObjet += ` - ${getProductCategoryLabel(quote.productCategory)}`;
    }
    
    // Add purchase order reference if present
    if (hasPurchaseOrder) {
      projectObjet += ` - Bon de Commande: ${quote.purchaseOrderNumber}`;
    }
  }

  // Extract line items
  const prestationsIncluses = quote.lineItems?.map((item: any) => {
    let itemDescription = item.description;
    
    // Add quantity and unit price for product quotes
    if (quote.businessType === 'PRODUCT') {
      itemDescription += ` (Qté: ${item.quantity}, Prix unitaire: ${item.unitPrice} MAD)`;
    }
    
    return itemDescription;
  }) || [
    'Nettoyage et dépoussiérage des plafonds, placards, façades, des rideaux et des embrasures.',
    'Nettoyage ciblé des résidus sur toutes les surfaces (murs, sols, vitres, plinthes).',
    'Nettoyage des interrupteurs, prises, poignées et rampes.',
    'Détartrage et désinfection des sanitaires (lavabos, douches, WC, baignoires).',
    'Nettoyage de cuisine : placards, plan de travail, crédences, électroménagers encastrés.',
    'Nettoyage complet des vitres et encadrement avec enlèvement des traces de chantier.',
    'Entretien et traitement des sols en fonction de leur type.'
  ];

  // Build payment conditions with purchase order info
  const paymentConditions = [
    'Les règlements peuvent être effectués par virement bancaire ou par chèque.'
  ];

  // Add purchase order information to payment conditions if present
  if (hasPurchaseOrder) {
    paymentConditions.push(`Bon de commande: ${quote.purchaseOrderNumber}`);
    paymentConditions.push(`Commandé par: ${quote.orderedBy}`);
  }

  return {
    docType,
    number: quote.quoteNumber.replace('Q-', '').replace('DEV-', '').replace('DV-', ''),
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
      attention: recipientAttention,
      addressLines: recipientAddressLines
    },
    project: {
      objet: projectObjet
    },
    prestation: {
      personnelMobilise: quote.businessType === 'SERVICE' ? [
        'Chef d\'équipe : supervision et contrôle qualité',
        `Agents de nettoyage (${Math.ceil((quote.surface || 170) / 50)} personne${Math.ceil((quote.surface || 170) / 50) > 1 ? 's' : ''})`,
        'Assistant technicien'
      ] : [
        'Équipe logistique pour la préparation',
        'Personnel de livraison qualifié',
        'Service client dédié'
      ],
      equipementsUtilises: quote.businessType === 'SERVICE' ? [
        'Aspirateur industriel pour poussière et collecte de l\'eau usée.',
        'Générateur de vapeur Emilio RA PLUS pour la désinfection et les taches tenaces.',
        'Échelles selon les besoins spécifiques pour les vitres et volets roulants extérieurs.',
        'Détergent pour les surfaces carrelées.',
        'Dégraissant (pH neutre) pour les surfaces en marbre.',
        'Nettoyant pour les surfaces en bois.',
        'Produits et matériel de nettoyage des vitres.',
        'Détergent et polish certifiés pour les surfaces métalliques.',
        'Outils généraux de ménage.'
      ] : [
        'Emballage sécurisé et professionnel',
        'Matériel de manutention approprié',
        'Véhicules de transport adaptés',
        'Équipement de protection',
        'Documentation complète (fiches techniques, certificats)'
      ],
      prestationsIncluses,
      delaiPrevu: quote.businessType === 'SERVICE' ? '1 journée' : (quote.deliveryType === 'EXPRESS' ? '24-48h' : '3-5 jours ouvrés')
    },
    amountHT: formatCurrency(Number(quote.finalPrice)),
    amountInWords: numberToFrenchWords(Number(quote.finalPrice)),
    payment: {
      conditions: paymentConditions,
      echeancier: quote.businessType === 'SERVICE' 
        ? '30% à l\'initiation du travail et 70% à la livraison'
        : (hasPurchaseOrder 
            ? 'Selon les termes du bon de commande' 
            : '50% à la commande et 50% à la livraison')
    }
  };
}

// Utility functions
function getPropertyTypeLabel(propertyType: string | null): string {
  const labels: { [key: string]: string } = {
    'APARTMENT_SMALL': 'appartement (petit)',
    'APARTMENT_MEDIUM': 'appartement (moyen)',
    'APARTMENT_LARGE': 'appartement (grand)',
    'APARTMENT_MULTI': 'appartement (multi-niveaux)',
    'VILLA_SMALL': 'villa (petite)',
    'VILLA_MEDIUM': 'villa (moyenne)',
    'VILLA_LARGE': 'villa (grande)',
    'PENTHOUSE': 'penthouse',
    'COMMERCIAL': 'local commercial',
    'STORE': 'magasin',
    'HOTEL_STANDARD': 'hôtel',
    'HOTEL_LUXURY': 'hôtel de luxe',
    'OFFICE': 'bureau',
    'RESIDENCE_B2B': 'résidence',
    'BUILDING': 'immeuble',
    'RESTAURANT': 'restaurant',
    'WAREHOUSE': 'entrepôt',
    'OTHER': 'espace'
  };
  return labels[propertyType || ''] || 'appartement';
}

function getProductCategoryLabel(category: string | null): string {
  const labels: Record<string, string> = {
    'EQUIPEMENT': 'Équipement de nettoyage',
    'PRODUIT_CHIMIQUE': 'Produits chimiques',
    'ACCESSOIRE': 'Accessoires',
    'CONSOMMABLE': 'Consommables',
    'CLEANING_SUPPLIES': 'Fournitures de nettoyage',
    'EQUIPMENT': 'Équipement',
    'CHEMICALS': 'Produits chimiques',
    'TOOLS': 'Outils',
    'OTHER': 'Divers',
    'AUTRE': 'Divers'
  };
  
  return labels[category || 'OTHER'] || 'Produits';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' MAD';
}

// NUMBER TO WORDS FUNCTION (Complete French conversion)
function numberToFrenchWords(amount: number): string {
  if (amount === 0) return "zéro dirhams hors taxes";
  
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
  const teens = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf"];
  const tens = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];
  
  const toWords = (num: number): string => {
    if (num === 0) return "";
    let words = "";
    
    if (num >= 1000000) {
      words += toWords(Math.floor(num / 1000000)) + " million" + (Math.floor(num / 1000000) > 1 ? "s " : " ");
      num %= 1000000;
    }
    
    if (num >= 1000) {
      const thousands = Math.floor(num / 1000);
      if (thousands > 1) {
        words += toWords(thousands) + " mille ";
      } else {
        words += "mille ";
      }
      num %= 1000;
    }
    
    if (num >= 100) {
      const hundreds = Math.floor(num / 100);
      if (hundreds > 1) {
        words += toWords(hundreds) + " cent" + (num % 100 === 0 ? "s " : " ");
      } else {
        words += "cent ";
      }
      num %= 100;
    }
    
    if (num >= 20) {
      const ten = Math.floor(num / 10);
      words += tens[ten];
      const unit = num % 10;
      if (unit === 1 && ten < 8) {
        words += " et un";
      } else if (unit > 0) {
        words += "-" + units[unit];
      }
    } else if (num >= 10) {
      words += teens[num - 10];
    } else if (num > 0) {
      words += units[num];
    }
    
    return words.trim() + " ";
  };
  
  const integerPart = Math.floor(amount);
  let result = toWords(integerPart).trim();
  result = result.charAt(0).toUpperCase() + result.slice(1) + " dirham" + (integerPart > 1 ? "s" : "");
  result += " hors taxe" + (integerPart > 1 ? "s" : "");
  
  return result;
}

export default generateQuotePDF;