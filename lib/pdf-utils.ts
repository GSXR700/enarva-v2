// lib/pdf-utils.ts
import jsPDF from 'jspdf';

export const BLUE_PRIMARY = [30, 58, 138] as const;
export const BLUE_DARK = [28, 63, 145] as const;
export const TEXT_DARK = [33, 33, 33] as const;
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN_LEFT = 40;
export const MARGIN_RIGHT = 40;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Fixed: Proper type handling for color arrays
export function setColor(doc: jsPDF, color: readonly [number, number, number]): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

export function setFillColor(doc: jsPDF, color: readonly [number, number, number]): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' MAD';
}

export function numberToFrenchWords(amount: number): string {
  if (amount === 0) return "zéro dirhams";
  
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
  
  return result;
}

export function generateObjectTitle(
  serviceType: string | null,
  propertyType: string | null,
  surface: number | null,
  levels: number | null,
  pdfContent: any
): string {
  const serviceLabel = serviceType && pdfContent.serviceTypes[serviceType]
    ? pdfContent.serviceTypes[serviceType].label
    : 'Prestation';
  
  const propertyLabel = propertyType && pdfContent.propertyTypes[propertyType]
    ? pdfContent.propertyTypes[propertyType]
    : 'bien';
  
  const surfaceText = surface ? `de ${surface} m²` : '';
  const levelsText = levels && levels > 1 ? `- ${levels} niveaux` : '';
  
  return `${serviceLabel} d'un(e) ${propertyLabel} ${surfaceText} ${levelsText}`.trim();
}

// Load PDF content from JSON - will return default if file doesn't exist
export function loadPDFContent(): any {
  // Default fallback content if JSON file is not available
  const defaultContent = {
    serviceTypes: {
      FIN_DE_CHANTIER: {
        label: "Nettoyage Fin de chantier",
        prestationsIncluses: [
          "Nettoyage et dépoussiérage des plafonds, placards, façades, rideaux et embrasures",
          "Nettoyage ciblé des résidus sur toutes les surfaces (murs, sols, vitres, plinthes)",
          "Nettoyage des interrupteurs, prises, poignées et rampes"
        ],
        equipementsUtilises: [
          "Aspirateur professionnel haute puissance",
          "Monobrosse pour sols durs",
          "Nettoyeur vapeur industriel"
        ],
        personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 50 }
      }
    },
    propertyTypes: {
      APARTMENT_SMALL: "appartement (petit)",
      APARTMENT_MEDIUM: "appartement (moyen)",
      VILLA_MEDIUM: "villa (moyenne)"
    },
    paymentConditions: {
      DEVIS_SERVICE_PARTICULIER: {
        title: "Conditions de paiement :",
        conditions: [
          "Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.",
          "Un acompte de 30% est demandé à l'initiation du travail."
        ]
      },
      FACTURE_SERVICE: {
        title: "Observations générales :",
        conditions: [
          "Toute réclamation doit être signalée sous 24 heures après la fin de l'intervention."
        ]
      }
    },
    deliveryTimeframes: {
      STANDARD: "3-5 jours ouvrés",
      EXPRESS: "24-48 heures"
    }
  };

  try {
    // In browser environment, you would fetch this
    // For now, return default content
    return defaultContent;
  } catch (e) {
    console.warn("Could not load PDF content, using defaults:", e);
    return defaultContent;
  }
}