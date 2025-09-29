// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function safeToNumber(value: any): number {
  if (!value && value !== 0) return 0
  
  if (typeof value === 'number') {
    return isNaN(value) ? 0 : value
  }
  
  if (value && typeof value === 'object') {
    if (typeof value.toNumber === 'function') {
      const num = value.toNumber()
      return isNaN(num) ? 0 : num
    }
    if (typeof value.toString === 'function') {
      const num = parseFloat(value.toString())
      return isNaN(num) ? 0 : num
    }
  }
  
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return isNaN(num) ? 0 : num
  }
  
  console.warn('Could not convert value to number:', value)
  return 0
}

export function formatCurrency(amount: any, currency = 'MAD') {
  const numericAmount = safeToNumber(amount)
  
  return new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numericAmount) + ` ${currency}`
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
    GENERAL: "Général",
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
  TaskType: {
    BATHROOM_CLEANING: "Nettoyage Sanitaires",
    WINDOW_CLEANING: "Nettoyage Vitres",
    FLOOR_CLEANING: "Nettoyage Sols",
    SURFACE_CLEANING: "Nettoyage Surfaces",
    DETAIL_FINISHING: "Finitions Détail",
    SETUP: "Préparation",
    CLEANUP: "Nettoyage Final",
    EXECUTION: "Exécution",
    QUALITY_CHECK: "Contrôle qualité",
    DOCUMENTATION: "Documentation",
    CLIENT_INTERACTION: "Interaction client",
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
    PUBLIC: "Public",
    NGO: "ONG",
    SYNDIC: "Syndic",
    OTHER: "Autre"
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
    HEBDOMADAIRE: "Hebdomadaire",
    MENSUEL: "Mensuel", 
    BIMENSUEL: "Bimensuel",
    TRIMESTRIEL: "Trimestriel",
    QUARTANNE: "Quartanne",
    SEMESTRIEL: "Semestriel",
    ANNUEL: "Annuel", 
    CONTRAT_CADRE: "Contrat Cadre",
    RECURRING: "Récurrent",
    AUTRE: "Autre"
  },
  ContractType: { 
    INTERVENTION_UNIQUE: "Intervention Unique", 
    MAINTENANCE: "Maintenance", 
    ABONNEMENT: "Abonnement",
    CONTRAT_CADRE: "Contrat Cadre",
    RECURRING: "Récurrent",
    AUTRE: "Autre"
  },
  ProviderType: { 
    ENARVA: "Fourni par Enarva", 
    CLIENT: "Fourni par le client",
    MIXTE: "Mixte"
  },
  EnarvaRole: { 
    PRESTATAIRE_PRINCIPAL: "Prestataire Principal", 
    SOUS_TRAITANT: "Sous-traitant",
    CO_TRAITANT: "Co-traitant",
    AUTRE: "Autre"
  },
  AccessibilityLevel: { 
    EASY: "Facile", 
    MEDIUM: "Moyenne",
    MODERATE: "Modérée", 
    DIFFICULT: "Difficile", 
    VERY_DIFFICULT: "Très difficile" 
  },
  QuoteStatus: {
    DRAFT: "Brouillon",
    SENT: "Envoyé",
    VIEWED: "Consulté",
    ACCEPTED: "Accepté",
    REJECTED: "Refusé",
    EXPIRED: "Expiré",
    CANCELLED: "Annulé"
  },
  QuoteType: {
    EXPRESS: "Express",
    STANDARD: "Standard",
    PREMIUM: "Premium"
  },
  Priority: {
    LOW: "Basse",
    NORMAL: "Normale",
    HIGH: "Élevée",
    CRITICAL: "Critique"
  },
  UserRole: {
    ADMIN: "Administrateur",
    MANAGER: "Manager",
    AGENT: "Agent",
    TEAM_LEADER: "Chef d'équipe",
    TECHNICIAN: "Technicien"
  }
};

export function translate(value: string | null | undefined): string {
  if (!value) return "N/A";
  
  for (const translationObj of Object.values(translations)) {
    if (translationObj[value as keyof typeof translationObj]) {
      return translationObj[value as keyof typeof translationObj];
    }
  }
  
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase().replace(/_/g, ' ');
}

export type ServiceType = 'GrandMénage' | 'FinDeChantier' | 'CristallisationMarbre' | 'MénageRégulier' | 'NettoyageVitre' | 'NettoyageBureau';

export interface ServiceInput {
  id: number;
  type: ServiceType;
  surface: number;
  levels: number;
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
        case 'MénageRégulier':
            if (totalSurface <= 100) return 12;
            if (totalSurface <= 250) return 10;
            return 8;
        case 'NettoyageVitre':
            if (totalSurface <= 50) return 8;
            if (totalSurface <= 150) return 6;
            return 5;
        case 'NettoyageBureau':
            if (totalSurface <= 200) return 10;
            if (totalSurface <= 500) return 8;
            return 6;
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

const calculateIndividualService = (service: ServiceInput): number => {
    const surface = service.surface * service.levels;
    const baseRate = getBaseRate(service.type, surface);
    const coeffs = getCoefficients(service);
    const finalCoeff = coeffs.distance * coeffs.etage * coeffs.delai * coeffs.difficulte;
    return Math.round(surface * baseRate * finalCoeff);
};

const getServiceDescription = (service: ServiceInput): string => {
    const serviceNames = {
        'GrandMénage': 'Grand Ménage Complet',
        'FinDeChantier': 'Nettoyage Fin de Chantier',
        'CristallisationMarbre': 'Cristallisation Marbre',
        'MénageRégulier': 'Ménage Régulier',
        'NettoyageVitre': 'Nettoyage de Vitres',
        'NettoyageBureau': 'Nettoyage de Bureau'
    };
    return serviceNames[service.type] || service.type;
};

const getServiceDetail = (service: ServiceInput): string => {
    const surface = service.surface * service.levels;
    const details = [`${surface}m²`];
    if (service.levels > 1) details.push(`${service.levels} niveaux`);
    if (service.distance > 10) details.push(`${service.distance}km`);
    if (service.etage !== 'RDC') details.push(service.etage === 'AvecAscenseur' ? 'Avec ascenseur' : 'Sans ascenseur');
    if (service.delai !== 'STANDARD') details.push(service.delai.toLowerCase());
    if (service.difficulte !== 'STANDARD') details.push(service.difficulte.toLowerCase());
    return details.join(' • ');
};

export function generateQuote(services: ServiceInput[]): QuoteCalculation {
    const lineItems: QuoteLineItem[] = services.map((service) => {
        const amount = calculateIndividualService(service);
        return {
            id: `service-${service.id}`,
            description: getServiceDescription(service),
            detail: getServiceDetail(service),
            amount,
            editable: true
        };
    });

    const subTotalHT = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const vatAmount = subTotalHT * 0.20;
    let totalTTC = subTotalHT + vatAmount;
    
    if (totalTTC < 500) totalTTC = 500;
    
    const finalPrice = Math.round(totalTTC / 10) * 10;

    return {
        lineItems,
        subTotalHT,
        vatAmount,
        totalTTC,
        finalPrice
    };
}

export const SERVICE_TYPES = [
  'Grand Ménage',
  'Nettoyage Standard', 
  'Nettoyage Express',
  'Nettoyage Vitres',
  'Nettoyage Post-Travaux',
  'Fin de chantier',
  'Nettoyage Bureaux',
  'Nettoyage Commercial',
  'Entretien Régulier'
] as const;

export const SERVICE_PRICING = {
  'Grand Ménage': { base: 200, perM2: 8 },
  'Nettoyage Standard': { base: 150, perM2: 6 },
  'Nettoyage Express': { base: 100, perM2: 4 },
  'Nettoyage Vitres': { base: 80, perM2: 3 },
  'Nettoyage Post-Travaux': { base: 300, perM2: 12 },
  'Fin de chantier': { base: 350, perM2: 15 },
  'Nettoyage Bureaux': { base: 120, perM2: 5 },
  'Nettoyage Commercial': { base: 180, perM2: 7 },
  'Entretien Régulier': { base: 100, perM2: 4 }
} as const;

export { safeToNumber };
