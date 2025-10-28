// lib/pdf-utils.ts - UPDATED
import jsPDF from 'jspdf';
// Import Prisma types used in this file
import { ServiceType, PropertyType } from '@prisma/client';

// ============================================================================
// CONSTANTS (Unchanged)
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

// Corrected: Handle null/undefined input gracefully
export function formatCurrency(amount: number | null | undefined): string {
   if (amount === null || amount === undefined || isNaN(amount)) {
       return '0.00 MAD';
   }
   return `${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} MAD`;
}


// Corrected: Added checks for NaN and edge cases
export function numberToFrenchWords(num: number): string {
   if (isNaN(num)) return "Montant invalide"; // Handle NaN input

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt'];

  if (num === 0) return 'Zéro dirham'; // Capitalize start
  let sign = '';
   if (num < 0) {
       sign = 'moins ';
       num = -num;
   }


  let result = '';
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  function convertThreeDigits(n: number): string {
    let partResult = '';
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
      partResult += (hundreds === 1 ? 'cent' : units[hundreds] + ' cent');
      // Add 's' to cent if it's plural and ends the number part (no remainder)
      if (hundreds > 1 && remainder === 0) {
          partResult += 's';
      }
      partResult += ' '; // Space after cent(s)
    }

    if (remainder > 0) {
      if (remainder < 10) {
        partResult += units[remainder];
      } else if (remainder < 20) {
        partResult += teens[remainder - 10];
      } else {
        const ten = Math.floor(remainder / 10);
        const unit = remainder % 10;
        if (ten === 7 || ten === 9) { // 70s and 90s
          const base = (ten === 7) ? 6 : 8; // sixty or eighty
          partResult += tens[base] + (unit === 0 ? '' : '-') + teens[unit];
        } else {
          partResult += tens[ten];
          if (unit === 1 && ten !== 8) { // Handle "et un" except for 81
             partResult = partResult.trimEnd(); // Remove space if any
             partResult += ' et un';
          } else if (unit > 0) {
             partResult += '-' + units[unit];
          }
        }
         // Add 's' to quatre-vingt if it ends the number part
         if (ten === 8 && unit === 0) {
            partResult += 's';
         }
      }
    }
    return partResult.trim();
  }


   // Process millions
  if (integerPart >= 1000000) {
    const millions = Math.floor(integerPart / 1000000);
     // Use convertThreeDigits for millions part
    result += (millions === 1 ? 'un million ' : convertThreeDigits(millions) + ' millions ');
  }

  // Process thousands
  const thousandsRemainder = integerPart % 1000000;
  if (thousandsRemainder >= 1000) {
    const thousands = Math.floor(thousandsRemainder / 1000);
     // 'mille' is invariable except for dates, etc. Don't add 'un' before mille alone.
    result += (thousands === 1 ? 'mille ' : convertThreeDigits(thousands) + ' mille ');
  }

  // Process last three digits
  const lastThreeDigits = integerPart % 1000;
  if (lastThreeDigits > 0) {
     result += convertThreeDigits(lastThreeDigits);
  }

  // Handle case where only millions or thousands were processed (result might be empty string for lastThreeDigits=0)
   if (result === '' && integerPart > 0) {
      // This case should ideally not happen with the logic above, but as a safeguard
      // If integerPart was exactly 1,000,000 or 1,000, result might be empty here. Re-evaluate.
      // Let's refine the main logic slightly.
      if (integerPart === 1000000) result = 'un million';
      else if (integerPart === 1000) result = 'mille';
      // Add more specific checks if needed
   } else if (result === '') {
       // Should only happen if integerPart was 0, handled at the start.
   }


  // Finalize integer part
  result = result.trim();
   // Add currency only if integer part > 0
   if (integerPart > 0) {
       result += ' dirham' + (integerPart > 1 ? 's' : '');
   }


  // Process decimal part
  if (decimalPart > 0) {
     // If there was an integer part, add 'et'
     if (integerPart > 0) {
         result += ' et ';
     }
    result += convertThreeDigits(decimalPart) + ' centime' + (decimalPart > 1 ? 's' : '');
  }

  // Capitalize first letter and add sign
  return sign + result.charAt(0).toUpperCase() + result.slice(1);
}


// Updated: Map all ServiceType enum values and common variations
export function normalizeServiceType(serviceType: string | null | undefined): ServiceType | null {
  if (!serviceType) return null; // Return null if input is null/undefined

  const normalized = serviceType.toUpperCase().replace(/[\s&]+/g, '_').replace(/[^\w]/g, ''); // More robust normalization

  // Direct mapping from enum keys (case-insensitive check just in case)
  for (const key in ServiceType) {
      if (key.toUpperCase() === normalized) {
          return key as ServiceType;
      }
  }

  // Map common French variations or abbreviations
  const mappings: Record<string, ServiceType> = {
    'GRAND_MENAGE': ServiceType.GRAND_MENAGE,
    'GRAND_MÉNAGE': ServiceType.GRAND_MENAGE, // Accent
    'FIN_DE_CHANTIER': ServiceType.NETTOYAGE_FIN_CHANTIER,
    'NETTOYAGE_FIN_DE_CHANTIER': ServiceType.NETTOYAGE_FIN_CHANTIER,
    'ENTRETIEN_REGULIER': ServiceType.ENTRETIEN_REGULIER,
    'NETTOYAGE_BUREAUX': ServiceType.NETTOYAGE_BUREAUX,
    'NETTOYAGE_BUREAU': ServiceType.NETTOYAGE_BUREAUX,
    'DESINFECTION_SANITAIRE': ServiceType.DESINFECTION_SANITAIRE,
    'SANITAIRES': ServiceType.DESINFECTION_SANITAIRE,
    'NETTOYAGE_CANAPES_MATELAS': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'CANAPES': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'MATELAS': ServiceType.NETTOYAGE_CANAPES_MATELAS,
    'NETTOYAGE_TAPIS_MOQUETTES': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'TAPIS': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'MOQUETTES': ServiceType.NETTOYAGE_TAPIS_MOQUETTES,
    'NETTOYAGE_VITRES': ServiceType.NETTOYAGE_VITRES,
    'VITRES': ServiceType.NETTOYAGE_VITRES,
    'NETTOYAGE_FACADE': ServiceType.NETTOYAGE_FACADE,
    'FACADE': ServiceType.NETTOYAGE_FACADE,
    'TRAITEMENT_SOL': ServiceType.TRAITEMENT_SOL,
    'CRISTALLISATION_MARBRE': ServiceType.CRISTALLISATION_MARBRE,
    'MARBRE': ServiceType.CRISTALLISATION_MARBRE,
    'VITRIFICATION_PARQUET': ServiceType.VITRIFICATION_PARQUET,
    'PARQUET': ServiceType.VITRIFICATION_PARQUET,
    'DECAPAGE_SOL': ServiceType.DECAPAGE_SOL,
    'DECAPAGE': ServiceType.DECAPAGE_SOL,
    'LUSTRAGE_MARBRE': ServiceType.LUSTRAGE_MARBRE,
    'LUSTRAGE': ServiceType.LUSTRAGE_MARBRE,
    'POLISSAGE_BETON': ServiceType.POLISSAGE_BETON,
    'BETON': ServiceType.POLISSAGE_BETON,
    'RENOVATION_SOL': ServiceType.RENOVATION_SOL,
    'RENOVATION': ServiceType.RENOVATION_SOL,
    'TRAITEMENT_ANTI_NUISIBLE': ServiceType.TRAITEMENT_ANTI_NUISIBLE,
    'NUISIBLES': ServiceType.TRAITEMENT_ANTI_NUISIBLE,
    'DERATISATION': ServiceType.TRAITEMENT_ANTI_NUISIBLE,
    'DESINSECTISATION': ServiceType.TRAITEMENT_ANTI_NUISIBLE,
    'LAVAGE_VOITURE_DOMICILE': ServiceType.LAVAGE_VOITURE_DOMICILE,
    'LAVAGE_AUTO': ServiceType.LAVAGE_VOITURE_DOMICILE,
    'ENTRETIEN_JARDIN': ServiceType.ENTRETIEN_JARDIN,
    'JARDINAGE': ServiceType.ENTRETIEN_JARDIN,
    'ENTRETIEN_PISCINE': ServiceType.ENTRETIEN_PISCINE,
    'PISCINE': ServiceType.ENTRETIEN_PISCINE,
    'NETTOYAGE_FOURS': ServiceType.NETTOYAGE_FOURS,
    'FOURS': ServiceType.NETTOYAGE_FOURS,
    'AUTRES': ServiceType.AUTRES,
    'AUTRE': ServiceType.AUTRES
  };

  // Return mapped enum value or null if no match found
  return mappings[normalized] || null;
}

// Updated: Use Prisma enums and handle nulls better
export function generateObjectTitle(
  serviceType: ServiceType | string | null | undefined, // Allow Prisma enum or string
  propertyType: PropertyType | string | null | undefined, // Allow Prisma enum or string
  surface: number | null | undefined,
  levels: number | null | undefined,
  pdfContent: any // Assuming loaded content structure
): string {

  let serviceLabel = "Prestation de Service"; // Default

  // Normalize and lookup service label
  const normalizedService = normalizeServiceType(serviceType); // Get the enum key
  if (normalizedService && pdfContent.serviceTypes?.[normalizedService]) {
      serviceLabel = pdfContent.serviceTypes[normalizedService].label;
  } else if (typeof serviceType === 'string') {
       // Fallback: format the input string if not found
       serviceLabel = serviceType.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  }


  let propertyLabel = ''; // Default to empty string
  // Use Prisma PropertyType enum for lookup if possible
  if (propertyType && pdfContent.propertyTypes?.[propertyType as PropertyType]) {
    propertyLabel = pdfContent.propertyTypes[propertyType as PropertyType];
  } else if (typeof propertyType === 'string') {
      // Fallback: format the input string
      propertyLabel = propertyType.replace(/_/g, ' ');
  }

  // Construct title parts
  let title = serviceLabel;
  if (propertyLabel) {
     title += ` pour ${propertyLabel}`;
  }
  if (surface && surface > 0) {
    title += ` (Surface: ${surface} m²)`; // More explicit
  }
  if (levels && levels > 1) {
    title += ` - ${levels} niveaux`;
  }

  return title.trim(); // Ensure no leading/trailing spaces
}


// Load PDF content from JSON
// Corrected: Return type matches usage, added more defaults from pdf-content.json
export function loadPDFContent(): any { // Keep 'any' type if structure varies or is complex
  // Default fallback content mirroring pdf-content.json structure
  const defaultContent = {
    serviceTypes: {
      // Add ALL service types from your enum with basic defaults
      [ServiceType.GRAND_MENAGE]: { label: "Grand Ménage", prestationsIncluses: ["Nettoyage approfondi"], equipementsUtilises: ["Matériel professionnel"], personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 70 }, dureeEstimee: "Variable" },
      [ServiceType.NETTOYAGE_FIN_CHANTIER]: { label: "Nettoyage Fin de chantier", prestationsIncluses: ["Élimination résidus", "Nettoyage complet"], equipementsUtilises: ["Matériel industriel"], personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 50 }, dureeEstimee: "1-2 jours" },
      [ServiceType.ENTRETIEN_REGULIER]: { label: "Entretien Régulier", prestationsIncluses: ["Maintien propreté"], equipementsUtilises: ["Matériel standard"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 100 }, dureeEstimee: "Selon contrat" },
      [ServiceType.NETTOYAGE_BUREAUX]: { label: "Nettoyage Bureaux", prestationsIncluses: ["Entretien locaux professionnels"], equipementsUtilises: ["Matériel bureaux"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 80 }, dureeEstimee: "Selon contrat" },
      [ServiceType.DESINFECTION_SANITAIRE]: { label: "Désinfection Sanitaire", prestationsIncluses: ["Nettoyage et désinfection"], equipementsUtilises: ["Désinfectants virucides"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 50 }, dureeEstimee: "1-3 heures" },
      [ServiceType.NETTOYAGE_CANAPES_MATELAS]: { label: "Nettoyage Canapés & Matelas", prestationsIncluses: ["Injection-extraction"], equipementsUtilises: ["Injecteur-extracteur"], personnelSuggestions: { baseTeamSize: 1 }, dureeEstimee: "1-3h / élément" },
      [ServiceType.NETTOYAGE_TAPIS_MOQUETTES]: { label: "Nettoyage Tapis & Moquettes", prestationsIncluses: ["Shampouinage"], equipementsUtilises: ["Injecteur-extracteur", "Monobrosse"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 30 }, dureeEstimee: "Variable" },
      [ServiceType.NETTOYAGE_VITRES]: { label: "Nettoyage Vitres", prestationsIncluses: ["Nettoyage vitres int/ext"], equipementsUtilises: ["Matériel vitrier"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 100 }, dureeEstimee: "Variable" },
      [ServiceType.NETTOYAGE_FACADE]: { label: "Nettoyage Façade", prestationsIncluses: ["Nettoyage HP/BP"], equipementsUtilises: ["Nettoyeur HP", "Nacelle"], personnelSuggestions: { baseTeamSize: 2, perSquareMeter: 40 }, dureeEstimee: "1+ jours" },
      [ServiceType.TRAITEMENT_SOL]: { label: "Traitement de Sol", prestationsIncluses: ["Traitement spécifique"], equipementsUtilises: ["Monobrosse"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 60 }, dureeEstimee: "Variable" },
      [ServiceType.CRISTALLISATION_MARBRE]: { label: "Cristallisation Marbre", prestationsIncluses: ["Cristallisation", "Lustrage"], equipementsUtilises: ["Monobrosse HS", "Produit cristallisant"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 60 }, dureeEstimee: "~1h / 15m²" },
      [ServiceType.VITRIFICATION_PARQUET]: { label: "Vitrification Parquet", prestationsIncluses: ["Ponçage", "Vitrification"], equipementsUtilises: ["Ponceuse parquet", "Vitrificateur"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 40 }, dureeEstimee: "2-4 jours" },
      [ServiceType.DECAPAGE_SOL]: { label: "Décapage Sol", prestationsIncluses: ["Décapage chimique/mécanique"], equipementsUtilises: ["Monobrosse", "Décapant"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 50 }, dureeEstimee: "Variable" },
      [ServiceType.LUSTRAGE_MARBRE]: { label: "Lustrage Marbre", prestationsIncluses: ["Spray méthode", "Lustrage"], equipementsUtilises: ["Monobrosse HS"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 100 }, dureeEstimee: "~1h / 75m²" },
      [ServiceType.POLISSAGE_BETON]: { label: "Polissage Béton", prestationsIncluses: ["Ponçage diamant", "Polissage"], equipementsUtilises: ["Surfaceuse béton"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 40 }, dureeEstimee: "Variable" },
      [ServiceType.RENOVATION_SOL]: { label: "Rénovation Sol", prestationsIncluses: ["Décapage/Ponçage", "Protection"], equipementsUtilises: ["Équipement adapté au sol"], personnelSuggestions: { baseTeamSize: 1, perSquareMeter: 50 }, dureeEstimee: "1+ jours" },
      [ServiceType.TRAITEMENT_ANTI_NUISIBLE]: { label: "Traitement Anti-Nuisible", prestationsIncluses: ["Inspection", "Traitement ciblé"], equipementsUtilises: ["Produits homologués"], personnelSuggestions: { baseTeamSize: 1 }, dureeEstimee: "1-4 heures" },
      [ServiceType.LAVAGE_VOITURE_DOMICILE]: { label: "Lavage Voiture Domicile", prestationsIncluses: ["Lavage ext/int"], equipementsUtilises: ["Matériel lavage auto"], personnelSuggestions: { baseTeamSize: 1 }, dureeEstimee: "1.5 - 3 heures" },
      [ServiceType.ENTRETIEN_JARDIN]: { label: "Entretien Jardin", prestationsIncluses: ["Tonte", "Taille", "Désherbage"], equipementsUtilises: ["Matériel jardinage"], personnelSuggestions: { baseTeamSize: 1 }, dureeEstimee: "Variable" },
      [ServiceType.ENTRETIEN_PISCINE]: { label: "Entretien Piscine", prestationsIncluses: ["Nettoyage bassin", "Analyse eau"], equipementsUtilises: ["Matériel piscine"], personnelSuggestions: { baseTeamSize: 1 }, dureeEstimee: "1 - 1.5 heure" },
      [ServiceType.NETTOYAGE_FOURS]: { label: "Nettoyage Fours", prestationsIncluses: ["Décapage graisses"], equipementsUtilises: ["Produits décapants"], personnelSuggestions: { baseTeamSize: 1 }, dureeEstimee: "1-3 heures" },
      [ServiceType.AUTRES]: { label: "Autres Services", prestationsIncluses: ["Prestation sur mesure"], equipementsUtilises: ["À définir"], personnelSuggestions: { baseTeamSize: 1 }, dureeEstimee: "À définir" }
    },
    propertyTypes: { // Keep original property types from pdf-generator
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
    paymentConditions: { // Keep original payment conditions
      DEVIS_SERVICE_PARTICULIER: { title: "Conditions de paiement :", conditions: ["Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.","Un acompte de 30% du montant total est exigible à la signature pour début des prestations."] },
      DEVIS_SERVICE_PRO: { title: "Conditions de paiement :", conditions: ["Paiement à 30 jours fin de mois.","Un acompte de 30% du montant total est exigible à la signature pour début des prestations."] },
      DEVIS_PRODUIT_PARTICULIER: { title: "Conditions de paiement :", conditions: ["Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.","Un acompte de 30% du montant total est exigible à la commande."] },
      DEVIS_PRODUIT_PRO: { title: "Conditions de paiement :", conditions: ["Paiement à 30 jours fin de mois.","Un acompte de 30% du montant total est exigible à la commande."] },
      FACTURE_SERVICE: { title: "Observations générales :", conditions: ["Toute réclamation doit être signalée sous 24 heures après la fin de l'intervention.","La présente facture vaut titre exécutoire en cas de non-paiement."] },
      FACTURE_PRODUIT: { title: "Observations générales :", conditions: ["Toute réclamation doit être signalée sous 48h après la livraison.","Les marchandises voyagent aux risques et périls du destinataire.","La présente facture vaut titre exécutoire en cas de non-paiement."] }
    },
    deliveryTimeframes: { // Keep original timeframes
      STANDARD: "3-5 jours ouvrés",
      EXPRESS: "24-48 heures",
      URGENT: "Intervention sous 24h",
      SCHEDULED: "Selon planning convenu",
       CUSTOM: "À définir selon disponibilités" // Added from pdf-templates
    }
    // Removed dynamicPhrases, qualityStatements, warrantyStatements if not used by pdf-generator.ts
  };

  try {
    // --- IMPORTANT ---
    // This is still using the DEFAULT content.
    // You MUST replace this logic to actually load your 'public/data/pdf-content.json' file.
    // How depends on your environment (Node.js/fs, fetch API, direct import).
    // Example using direct import (if build setup allows):
    // import actualContentFromFile from '@/public/data/pdf-content.json';
    // return actualContentFromFile || defaultContent;

    // For now, returning the hardcoded default:
    console.warn("loadPDFContent is using hardcoded default data. Configure actual file loading.");
    return defaultContent;
  } catch (e) {
    console.error("Could not load PDF content, using defaults:", e);
    return defaultContent;
  }
}