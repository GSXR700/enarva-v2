// lib/utils.ts - FIXED VERSION
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'MAD') {
  return new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ` ${currency}`
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatTime(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function getRelativeTime(date: string | Date) {
  const now = new Date()
  const inputDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - inputDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'À l\'instant'
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `Il y a ${diffInMinutes} min`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `Il y a ${diffInHours}h`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) {
    return `Il y a ${diffInDays}j`
  }

  return formatDate(date)
}

// --- SECTION DE TRADUCTION CENTRALISÉE ---
export const translations = {
  LeadStatus: {
    NEW: "Nouveau",
    TO_QUALIFY: "À qualifier",
    WAITING_INFO: "En attente d'infos",
    QUALIFIED: "Qualifié",
    VISIT_PLANNED: "Visite planifiée",
    ON_VISIT: "Visite en cours",
    VISIT_DONE: "Visite terminée",
    QUOTE_SENT: "Devis envoyé",
    QUOTE_ACCEPTED: "Devis accepté",
    QUOTE_REFUSED: "Devis refusé",
    MISSION_SCHEDULED: "Mission planifiée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminé",
    INTERVENTION_PLANNED: "Intervention planifiée",
    INTERVENTION_IN_PROGRESS: "Intervention en cours",
    INTERVENTION_DONE: "Intervention terminée",
    QUALITY_CONTROL: "Contrôle qualité",
    CLIENT_TO_CONFIRM_END: "Attente confirmation client",
    CLIENT_CONFIRMED: "Client confirmé",
    DELIVERY_PLANNED: "Livraison planifiée",
    DELIVERY_DONE: "Livraison effectuée",
    SIGNED_DELIVERY_NOTE: "Bon de livraison signé",
    PENDING_PAYMENT: "En attente de paiement",
    PAID_OFFICIAL: "Payé (officiel)",
    PAID_CASH: "Payé (cash)",
    REFUNDED: "Remboursé",
    PENDING_REFUND: "En attente de remboursement",
    FOLLOW_UP_SENT: "Relance envoyée",
    UPSELL_IN_PROGRESS: "Upsell en cours",
    UPSELL_CONVERTED: "Upsell converti",
    REWORK_PLANNED: "Reprise planifiée",
    REWORK_DONE: "Reprise effectuée",
    UNDER_WARRANTY: "Sous garantie",
    AFTER_SALES_SERVICE: "SAV",
    CLIENT_ISSUE: "Problème client",
    IN_DISPUTE: "En litige",
    CLIENT_PAUSED: "Mis en pause (client)",
    LEAD_LOST: "Lead perdu",
    CANCELLED: "Annulé",
    CANCELED_BY_CLIENT: "Annulé par le client",
    CANCELED_BY_ENARVA: "Annulé par Enarva",
    INTERNAL_REVIEW: "Revue interne",
    AWAITING_PARTS: "En attente de pièces",
    CONTRACT_SIGNED: "Contrat signé",
    UNDER_CONTRACT: "Sous contrat",
    SUBCONTRACTED: "Sous-traité",
    OUTSOURCED: "Externalisé",
    WAITING_THIRD_PARTY: "Attente tiers",
    PRODUCT_ONLY: "Produit seul",
    PRODUCT_SUPPLIER: "Fournisseur produit",
    DELIVERY_ONLY: "Livraison seule",
    AFFILIATE_LEAD: "Lead affilié",
    SUBCONTRACTOR_LEAD: "Lead sous-traitant",
    CONVERTED_CLIENT: "Converti en client",
    ARCHIVED: "Archivé",
    LOST: "Perdu",
  },
  MissionStatus: {
    SCHEDULED: "Planifiée",
    IN_PROGRESS: "En cours",
    QUALITY_CHECK: "Contrôle Qualité",
    CLIENT_VALIDATION: "Validation Client",
    COMPLETED: "Terminée",
    CANCELLED: "Annulée",
  },
  MissionType: {
    SERVICE: "Service",
    TECHNICAL_VISIT: "Visite Technique",
    DELIVERY: "Livraison",
    INTERNAL: "Interne",
    RECURRING: "Service Récurrent"
  },
  TaskCategory: {
    EXTERIOR_FACADE: "Extérieur & Façade",
    WALLS_BASEBOARDS: "Murs & Plinthes",
    FLOORS: "Sols",
    STAIRS: "Escaliers",
    WINDOWS_JOINERY: "Vitres & Menuiseries",
    KITCHEN: "Cuisine",
    BATHROOM_SANITARY: "Sanitaires",
    LIVING_SPACES: "Pièces de vie",
    LOGISTICS_ACCESS: "Logistique & Accès",
  },
  TaskStatus: {
    ASSIGNED: "Assignée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminée",
    VALIDATED: "Validée",
    REJECTED: "Rejetée",
  },
  LeadCanal: {
    WHATSAPP: "WhatsApp",
    FACEBOOK: "Facebook",
    INSTAGRAM: "Instagram",
    LINKEDIN: "LinkedIn",
    GOOGLE_MAPS: "Maps",
    GOOGLE_SEARCH: "Google",
    SITE_WEB: "Site Web",
    FORMULAIRE_SITE: "Formulaire Site",
    MARKETPLACE: "Marketplace",
    YOUTUBE: "YouTube",
    EMAIL: "Email",
    APPORTEUR_AFFAIRES: "Apporteur d'affaires",
    COMMERCIAL_TERRAIN: "Commercial Terrain",
    SALON_PROFESSIONNEL: "Salon Professionnel",
    PARTENARIAT: "Partenariat",
    RECOMMANDATION_CLIENT: "Recommandation",
    VISITE_BUREAU: "Visite Bureau",
    EMPLOYE_ENARVA: "Employé Enarva",
    APPEL_TELEPHONIQUE: "Appel Téléphonique",
    SMS: "SMS",
    NUMERO_SUR_PUB: "Numéro sur Pub",
    AFFICHE: "Affiche",
    FLYER: "Flyer",
    ENSEIGNE: "Enseigne",
    VOITURE_SIGLEE: "Voiture Siglée",
    RADIO: "Radio",
    ANNONCE_PRESSE: "Annonce Presse",
    TELE: "Télé",
    MANUEL: "Manuel",
    SOURCING_INTERNE: "Sourcing Interne",
    PORTE_A_PORTE: "Porte à Porte",
    CHANTIER_EN_COURS: "Chantier en cours"
  },
  LeadType: { 
    PARTICULIER: "Particulier", 
    PROFESSIONNEL: "Professionnel", 
    PUBLIC: "Public" 
  },
  UrgencyLevel: { 
    LOW: "Faible",
    NORMAL: "Normal", 
    URGENT: "Urgent", 
    HIGH_URGENT: "Très urgent", 
    IMMEDIATE: "Immédiat" 
  },
  PropertyType: {
  APARTMENT_SMALL: "Appartement (Petit)",
  APARTMENT_MEDIUM: "Appartement (Moyen)",
  APARTMENT_MULTI: "Appartement (Multi-niveaux)",
  APARTMENT_LARGE: "Appartement (Grand)",
  VILLA_SMALL: "Villa (Petite)",
  VILLA_MEDIUM: "Villa (Moyenne)",
  VILLA_LARGE: "Villa (Grande)",
  PENTHOUSE: "Penthouse",
  COMMERCIAL: "Local Commercial",
  STORE: "Magasin",
  HOTEL_STANDARD: "Hôtel (Standard)",
  HOTEL_LUXURY: "Hôtel (Luxe)",
  OFFICE: "Bureau",
  RESIDENCE_B2B: "Résidence B2B",
  BUILDING: "Immeuble",
  RESTAURANT: "Restaurant",
  WAREHOUSE: "Entrepôt",
  OTHER: "Autre"
},
  Frequency: { 
    PONCTUEL: "Ponctuel", 
    MENSUEL: "Mensuel", 
    ANNUEL: "Annuel", 
    CONTRAT_CADRE: "Contrat Cadre" 
  },
  ContractType: { 
    INTERVENTION_UNIQUE: "Intervention Unique", 
    MAINTENANCE: "Maintenance", 
    ABONNEMENT: "Abonnement" 
  },
  ProviderType: { 
    ENARVA: "Fourni par Enarva", 
    CLIENT: "Fourni par le client" 
  },
  EnarvaRole: { 
    PRESTATAIRE_PRINCIPAL: "Prestataire Principal", 
    SOUS_TRAITANT: "Sous-traitant" 
  },
  AccessibilityLevel: { 
    EASY: "Facile", 
    MEDIUM: "Moyenne", 
    DIFFICULT: "Difficile", 
    VERY_DIFFICULT: "Très difficile" 
  },
};

/**
 * FIXED: Single parameter translate function
 * Automatically detects the enum type from value patterns
 */
export function translate(value: string | null | undefined): string {
  if (!value) return "N/A";
  
  // Try to find the value in any of our translation objects
  for (const [key, translationObj] of Object.entries(translations)) {
    if (translationObj[value as keyof typeof translationObj]) {
      return translationObj[value as keyof typeof translationObj];
    }
  }
  
  // If no translation found, return a formatted version of the original value
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

// --- MOTEUR DE CALCUL DE DEVIS ENARVA V2 ---

export type ServiceType = 'GrandMénage' | 'FinDeChantier' | 'CristallisationMarbre';

export interface ServiceInput {
  id: number;
  type: ServiceType;
  surface: number;
  levels: number; // Nombre de niveaux
  distance: number;
  etage: 'RDC' | 'AvecAscenseur' | 'SansAscenseur';
  delai: 'STANDARD' | 'URGENT' | 'IMMEDIAT';
  difficulte: 'STANDARD' | 'DIFFICILE' | 'EXTREME';
}

export interface QuoteLineItem {
  id: string;
  description: string;
  detail: string;
  amount: number;
  editable: boolean;
}

export interface QuoteCalculation {
  lineItems: QuoteLineItem[];
  subTotalHT: number;
  vatAmount: number;
  totalTTC: number;
  finalPrice: number;
}

const getBaseRate = (type: ServiceType, totalSurface: number): number => {
    switch (type) {
        case 'GrandMénage':
            if (totalSurface <= 80) return 16;
            if (totalSurface <= 200) return 14;
            return 12;
        case 'FinDeChantier':
            if (totalSurface <= 200) return 24;
            return 19;
        case 'CristallisationMarbre':
            if (totalSurface <= 100) return 30;
            if (totalSurface <= 300) return 25;
            if (totalSurface <= 600) return 20;
            return 19;
        default: return 20;
    }
};

const getCoefficients = (service: ServiceInput) => {
    const coeffs = {
        distance: 1.0, etage: 1.0, delai: 1.0, difficulte: 1.0
    };
    if (service.distance > 10) coeffs.distance = 1.15;
    if (service.etage === 'SansAscenseur') coeffs.etage = 1.3;
    else if (service.etage === 'AvecAscenseur') coeffs.etage = 1.1;
    if (service.delai === 'IMMEDIAT') coeffs.delai = 1.8;
    else if (service.delai === 'URGENT') coeffs.delai = 1.4;
    if (service.difficulte === 'EXTREME') coeffs.difficulte = 1.5;
    else if (service.difficulte === 'DIFFICILE') coeffs.difficulte = 1.2;
    return coeffs;
};

export function generateQuote(services: ServiceInput[]): QuoteCalculation {
    let lineItems: QuoteLineItem[] = [];
    let subTotalHT = 0;

    services.forEach((service) => {
        const totalSurface = service.surface * service.levels;
        const baseRate = getBaseRate(service.type, totalSurface);
        const coefficients = getCoefficients(service);
        
        const finalRate = baseRate * coefficients.distance * coefficients.etage * 
                          coefficients.delai * coefficients.difficulte;
        const lineTotal = totalSurface * finalRate;
        
        lineItems.push({
            id: `service-${service.id}`,
            description: `${service.type} - ${totalSurface}m²`,
            detail: `${service.surface}m² × ${service.levels} niveau(x) @ ${finalRate.toFixed(2)} MAD/m²`,
            amount: lineTotal,
            editable: false
        });
        
        subTotalHT += lineTotal;
    });

    const vatAmount = subTotalHT * 0.20;
    const totalTTC = subTotalHT + vatAmount;

    return {
        lineItems,
        subTotalHT,
        vatAmount,
        totalTTC,
        finalPrice: totalTTC
    };
}

// Dans lib/utils.ts - Ajouter à la fonction generateQuote
export const SERVICE_TYPES = [
  'Grand Ménage',
  'Nettoyage Standard', 
  'Nettoyage Express',
  'Nettoyage Vitres',
  'Nettoyage Post-Travaux',
  'Fin de chantier', // ← Service ajouté
  'Nettoyage Bureaux',
  'Nettoyage Commercial',
  'Entretien Régulier'
] as const;

// Pricing pour le service "Fin de chantier"
const SERVICE_PRICING = {
  'Grand Ménage': { base: 200, perM2: 8 },
  'Nettoyage Standard': { base: 150, perM2: 6 },
  'Nettoyage Express': { base: 100, perM2: 4 },
  'Nettoyage Vitres': { base: 80, perM2: 3 },
  'Nettoyage Post-Travaux': { base: 300, perM2: 12 },
  'Fin de chantier': { base: 350, perM2: 15 }, // ← Pricing ajouté
  'Nettoyage Bureaux': { base: 120, perM2: 5 },
  'Nettoyage Commercial': { base: 180, perM2: 7 },
  'Entretien Régulier': { base: 100, perM2: 4 }
};