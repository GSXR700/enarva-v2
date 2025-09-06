// lib/utils.ts - COMPLETE TRANSLATIONS ADDED
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
    GOOGLE_MAPS: "Google Maps", 
    GOOGLE_SEARCH: "Recherche Google", 
    SITE_WEB: "Site Web", 
    FORMULAIRE_SITE: "Formulaire Site", 
    MARKETPLACE: "Marketplace", 
    YOUTUBE: "YouTube", 
    EMAIL: "Email", 
    APPORTEUR_AFFAIRES: "Apporteur d'affaires", 
    COMMERCIAL_TERRAIN: "Commercial Terrain", 
    SALON_PROFESSIONNEL: "Salon Professionnel", 
    PARTENARIAT: "Partenariat", 
    RECOMMANDATION_CLIENT: "Recommandation Client", 
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
  LeadType: { PARTICULIER: "Particulier", PROFESSIONNEL: "Professionnel", PUBLIC: "Public" },
  UrgencyLevel: { NORMAL: "Normal", URGENT: "Urgent", HIGH_URGENT: "Très urgent", IMMEDIATE: "Immédiat" },
  PropertyType: { 
    APARTMENT_SMALL: "Appartement (Petit)", 
    APARTMENT_MEDIUM: "Appartement (Moyen)", 
    APARTMENT_MULTI: "Appartement (Multi-niveaux)", 
    VILLA_LARGE: "Villa (Grande)", 
    COMMERCIAL: "Local Commercial", 
    HOTEL_STANDARD: "Hôtel (Standard)", 
    HOTEL_LUXURY: "Hôtel (Luxe)", 
    OFFICE: "Bureau", 
    RESIDENCE_B2B: "Résidence B2B", 
    RESTAURANT: "Restaurant" 
  },
  Frequency: { PONCTUEL: "Ponctuel", MENSUEL: "Mensuel", ANNUEL: "Annuel", CONTRAT_CADRE: "Contrat Cadre" },
  ContractType: { INTERVENTION_UNIQUE: "Intervention Unique", MAINTENANCE: "Maintenance", ABONNEMENT: "Abonnement" },
  ProviderType: { ENARVA: "Fourni par Enarva", CLIENT: "Fourni par le client" },
  EnarvaRole: { PRESTATAIRE_PRINCIPAL: "Prestataire Principal", SOUS_TRAITANT: "Sous-traitant" },
  AccessibilityLevel: { EASY: "Facile", MEDIUM: "Moyenne", DIFFICULT: "Difficile", VERY_DIFFICULT: "Très difficile" },
};

/**
 * Traduit une valeur d'enum en chaîne de caractères lisible.
 * @param key Le type de l'enum (ex: 'LeadStatus')
 * @param value La valeur de l'enum (ex: 'IN_PROGRESS')
 * @returns La chaîne traduite (ex: 'En cours')
 */
export function translate(key: keyof typeof translations, value: string | null | undefined): string {
    if (!value) return "N/A";
    // @ts-ignore
    const translated = translations[key]?.[value] || value;
    return translated.charAt(0).toUpperCase() + translated.slice(1).toLowerCase();
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
            if (totalSurface <= 200) return 24; // Simplifié pour l'exemple
            return 19;
        case 'CristallisationMarbre':
            if (totalSurface <= 100) return 30;
            if (totalSurface <= 300) return 25;
            if (totalSurface <= 600) return 20;
            return 19;
        default: return 20; // Taux par défaut
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

    services.forEach((service, index) => {
        const coeffs = getCoefficients(service);
        const baseRate = getBaseRate(service.type, service.surface);
        const totalCoefficient = coeffs.distance * coeffs.etage * coeffs.delai * coeffs.difficulte;
        const pricePerSquareMeter = baseRate * totalCoefficient;
        const totalPrice = service.surface * pricePerSquareMeter;

        lineItems.push({
            id: `${index + 1}`,
            description: `${service.type} - ${service.surface}m²`,
            detail: `Surface: ${service.surface}m² | Taux de base: ${baseRate} MAD/m² | Coefficient total: ${totalCoefficient.toFixed(2)}`,
            amount: Number(totalPrice.toFixed(2)),
            editable: true,
        });

        subTotalHT += totalPrice;
    });

    const vatAmount = subTotalHT * 0.20;
    const totalTTC = subTotalHT + vatAmount;
    const finalPrice = Math.round(totalTTC / 50) * 50;

    return {
        lineItems,
        subTotalHT: Number(subTotalHT.toFixed(2)),
        vatAmount: Number(vatAmount.toFixed(2)),
        totalTTC: Number(totalTTC.toFixed(2)),
        finalPrice,
    };
}