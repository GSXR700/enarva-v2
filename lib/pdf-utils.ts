import jsPDF from 'jspdf';

// ============================================================================
// CONSTANTS
// ============================================================================
export const BLUE_PRIMARY = [30, 58, 138] as const;
export const BLUE_SECONDARY = [59, 130, 246] as const;
export const TEXT_DARK = [33, 33, 33] as const;
export const PAGE_WIDTH = 595.28;
export const PAGE_HEIGHT = 841.89;
export const MARGIN_LEFT = 40;
export const MARGIN_RIGHT = 40;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function setColor(doc: jsPDF, color: readonly [number, number, number]): void {
  doc.setTextColor(color[0], color[1], color[2]);
}

export function setFillColor(doc: jsPDF, color: readonly [number, number, number]): void {
  doc.setFillColor(color[0], color[1], color[2]);
}

export function formatCurrency(amount: number): string {
  return `${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD`;
}

export function numberToFrenchWords(num: number): string {
  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  if (num === 0) return 'zéro dirhams';
  if (num < 0) return 'moins ' + numberToFrenchWords(-num);

  let result = '';
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  // Process millions
  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000);
    result += (millions === 1 ? 'un million ' : numberToFrenchWords(millions).replace(/ dirhams?/, '') + ' millions ');
  }

  // Process thousands
  const thousandsRemainder = integerPart % 1000000;
  if (thousandsRemainder >= 1000) {
    const thousands = Math.floor(thousandsRemainder / 1000);
    result += (thousands === 1 ? 'mille ' : numberToFrenchWords(thousands).replace(/ dirhams?/, '') + ' mille ');
  }

  // Process hundreds
  const lastThreeDigits = integerPart % 1000;
  if (lastThreeDigits >= 100) {
    const hundreds = Math.floor(lastThreeDigits / 100);
    result += (hundreds === 1 ? 'cent ' : units[hundreds] + ' cent ');
    if (lastThreeDigits % 100 === 0 && hundreds > 1) {
      result = result.trim() + 's ';
    }
  }

  // Process tens and units
  const lastTwo = lastThreeDigits % 100;
  if (lastTwo > 0) {
    if (lastTwo < 10) {
      result += units[lastTwo];
    } else if (lastTwo < 20) {
      result += teens[lastTwo - 10];
    } else {
      const ten = Math.floor(lastTwo / 10);
      const unit = lastTwo % 10;
      if (ten === 7 || ten === 9) {
          const base = (ten === 7) ? 6 : 8;
          result += tens[base] + (unit === 0 ? '' : '-') + teens[unit];
      } else {
          result += tens[ten];
          if (unit === 1 && ten < 8) {
              result += ' et un';
          } else if (unit > 0) {
              result += '-' + units[unit];
          }
      }
      if (ten === 8 && unit === 0) {
        result += 's';
      }
    }
  }

  // Finalize integer part
  result = result.trim();
  result += ' dirham' + (integerPart > 1 ? 's' : '');

  // Process decimal part
  if (decimalPart > 0) {
    result += ' et ' + numberToFrenchWords(decimalPart).replace(/ dirhams?/, '').trim() + ' centime' + (decimalPart > 1 ? 's' : '');
  }
  
  // Capitalize first letter
  return result.charAt(0).toUpperCase() + result.slice(1);
}


// Map service names to template keys
export function normalizeServiceType(serviceType: string | null): string {
  if (!serviceType) return 'FIN_DE_CHANTIER';

  const normalized = serviceType.toUpperCase().replace(/\s+/g, '_');

  // Map variations to standard keys
  const mappings: Record<string, string> = {
    'FIN_DE_CHANTIER': 'FIN_DE_CHANTIER',
    'NETTOYAGE_FIN_DE_CHANTIER': 'FIN_DE_CHANTIER',
    'GRAND_MENAGE': 'GRAND_MENAGE',
    'GRAND_MÉNAGE': 'GRAND_MENAGE',
    'NETTOYAGE_STANDARD': 'NETTOYAGE_STANDARD',
    'NETTOYAGE_BUREAUX': 'NETTOYAGE_BUREAUX',
    'ENTRETIEN_REGULIER': 'ENTRETIEN_REGULIER',
    'NETTOYAGE_VITRES': 'NETTOYAGE_VITRES',
    'CRISTALLISATION_MARBRE': 'CRISTALLISATION_MARBRE',
  };

  return mappings[normalized] || 'FIN_DE_CHANTIER';
}

export function generateObjectTitle(
  serviceType: string | null,
  propertyType: string | null,
  surface: number | null,
  levels: number | null,
  pdfContent: any
): string {
  // Normalize serviceType before lookup
  const normalizedServiceType = normalizeServiceType(serviceType);

  const serviceLabel = pdfContent.serviceTypes[normalizedServiceType]
    ? pdfContent.serviceTypes[normalizedServiceType].label
    : 'Prestation';

  const propertyLabel = propertyType && pdfContent.propertyTypes[propertyType]
    ? pdfContent.propertyTypes[propertyType]
    : 'bien';

  const surfaceText = surface ? `de ${surface} m²` : '';
  const levelsText = levels && levels > 1 ? `- ${levels} niveaux` : '';

  return `${serviceLabel} pour ${propertyLabel} ${surfaceText} ${levelsText}`.trim();
}

// Load PDF content from JSON - will return default if file doesn't exist
export function loadPDFContent(): any {
  // Default fallback content if JSON file is not available
  const defaultContent = {
    serviceTypes: {
      FIN_DE_CHANTIER: {
        label: "Nettoyage Fin de chantier",
        prestationsIncluses: [
          "Dépoussiérage complet (plafonds, placards, façades, rideaux) et nettoyage des points de contact",
          "Nettoyage ciblé des résidus de chantier sur toutes les surfaces (murs, sols, plinthes)",
          "Détartrage et désinfection approfondis des sanitaires et de la cuisine (placards, plans de travail)",
          "Nettoyage complet des vitres et encadrements, et traitement spécifique de tous les types de sols"
        ],
        equipementsUtilises: [
          "Aspirateurs professionnels haute puissance",
          "Monobrosse pour sols durs et nettoyeur vapeur industriel",
          "Échelles et équipements d'accès en hauteur",
          "Produits décapants écologiques et désinfectants professionnels certifiés"
        ],
        personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 50 }
      },
      GRAND_MENAGE: {
    label: "Grand Ménage",
    prestationsIncluses: [
        "Dépoussiérage approfondi (surfaces, luminaires, toiles d'araignées)",
        "Nettoyage complet des vitres (int/ext) et des placards intérieurs",
        "Désinfection complète de la cuisine et des sanitaires",
        "Aspiration et nettoyage de tous les sols"
    ],
    equipementsUtilises: [
        "Aspirateurs professionnels et nettoyeur vapeur",
        "Matériel de nettoyage vitres",
        "Produits de nettoyage multi-surfaces et désinfectants sanitaires"
    ],
    personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 70 }
},
      NETTOYAGE_STANDARD: { // Restored from original file
        label: "Nettoyage Standard",
        prestationsIncluses: [
            "Dépoussiérage des surfaces",
            "Nettoyage des sols",
            "Nettoyage des sanitaires",
            "Vidage des poubelles"
        ],
        equipementsUtilises: [
            "Aspirateur",
            "Balai et serpillère",
            "Produits de nettoyage standards"
        ],
        personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 80 }
      },
      NETTOYAGE_VITRES: {
        label: "Nettoyage de vitres",
        prestationsIncluses: [
          "Nettoyage intérieur des vitres",
          "Nettoyage extérieur des vitres",
          "Nettoyage des cadres",
          "Élimination des traces"
        ],
        equipementsUtilises: [
          "Perches télescopiques",
          "Raclettes professionnelles",
          "Produits vitres professionnels"
        ],
        personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 100 }
      },
      CRISTALLISATION_MARBRE: {
        label: "Cristallisation de marbre",
        prestationsIncluses: [
          "Préparation du marbre",
          "Ponçage et polissage",
          "Application de cristallisant",
          "Lustrage haute brillance"
        ],
        equipementsUtilises: [
          "Monobrosse professionnelle",
          "Disques de cristallisation",
          "Produits cristallisants spécialisés"
        ],
        personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 60 }
      },
      NETTOYAGE_BUREAUX: {
        label: "Nettoyage Bureaux",
        prestationsIncluses: [
          "Dépoussiérage des postes de travail",
          "Aspiration des sols et moquettes",
          "Nettoyage des sanitaires",
          "Vider les corbeilles"
        ],
        equipementsUtilises: [
          "Aspirateur professionnel",
          "Chariots de nettoyage",
          "Produits professionnels",
          "Matériel de nettoyage bureautique"
        ],
        personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 70 }
      },
      ENTRETIEN_REGULIER: {
        label: "Entretien Régulier",
        prestationsIncluses: [
          "Nettoyage quotidien des surfaces",
          "Entretien des sols",
          "Nettoyage des sanitaires",
          "Maintien de la propreté générale"
        ],
        equipementsUtilises: [
          "Équipement standard de nettoyage",
          "Produits d'entretien écologiques"
        ],
        personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 100 }
      }
    },
    propertyTypes: {
      APARTMENT_SMALL: "appartement",
      APARTMENT_MEDIUM: "appartement",
      APARTMENT_LARGE: "appartement",
      APARTMENT_MULTI: "appartement multi-niveaux",
      VILLA_SMALL: "villa",
      VILLA_MEDIUM: "villa",
      VILLA_LARGE: "villa",
      PENTHOUSE: "penthouse",
      COMMERCIAL: "local commercial",
      STORE: "magasin",
      HOTEL_STANDARD: "hôtel",
      HOTEL_LUXURY: "hôtel de luxe",
      OFFICE: "bureau",
      RESIDENCE_B2B: "résidence",
      BUILDING: "immeuble",
      RESTAURANT: "restaurant",
      WAREHOUSE: "entrepôt",
      OTHER: "espace"
    },
    paymentConditions: {
      DEVIS_SERVICE_PARTICULIER: {
        title: "Conditions de paiement :",
        conditions: [
          "Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.",
          "Un acompte de 30% est demandé à l'initiation du travail."
        ]
      },
      DEVIS_SERVICE_PRO: {
        title: "Conditions de paiement :",
        conditions: [
          "Paiement à 30 jours fin de mois.",
          "Un acompte de 40% est demandé à la signature du contrat."
        ]
      },
      FACTURE_SERVICE: {
        title: "Observations générales :",
        conditions: [
          "Toute réclamation doit être signalée sous 24 heures après la fin de l'intervention.",
          "La présente facture vaut titre exécutoire en cas de non-paiement."
        ]
      }
    },
    deliveryTimeframes: {
      STANDARD: "3-5 jours ouvrés",
      EXPRESS: "24-48 heures",
      URGENT: "Intervention sous 24h",
      SCHEDULED: "Selon planning convenu"
    }
  };

  try {
    // In a real browser environment, you might fetch this from a server
    // For this context, we return the default content directly
    return defaultContent;
  } catch (e) {
    console.warn("Could not load PDF content, using defaults:", e);
    return defaultContent;
  }
}