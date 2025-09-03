// lib/utils.ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LeadStatus, LeadCanal, LeadType, UrgencyLevel, PropertyType, Frequency, ContractType, ProviderType, EnarvaRole, AccessibilityLevel } from '@prisma/client'

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
    QUALIFIED: "Qualifié",
    QUOTE_SENT: "Devis envoyé",
    QUOTE_ACCEPTED: "Devis accepté",
    MISSION_SCHEDULED: "Mission planifiée",
    IN_PROGRESS: "En cours",
    COMPLETED: "Terminé",
    CANCELLED: "Annulé",
    VISIT_PLANNED: "Visite planifiée",
    ON_VISIT: "Visite en cours",
    VISIT_DONE: "Visite terminée"
  },
  LeadCanal: { WHATSAPP: "WhatsApp", FACEBOOK: "Facebook", INSTAGRAM: "Instagram", LINKEDIN: "LinkedIn", GOOGLE_MAPS: "Google Maps", GOOGLE_SEARCH: "Recherche Google", SITE_WEB: "Site Web", FORMULAIRE_SITE: "Formulaire Site", MARKETPLACE: "Marketplace", YOUTUBE: "YouTube", EMAIL: "Email", APPORTEUR_AFFAIRES: "Apporteur d'affaires", COMMERCIAL_TERRAIN: "Commercial Terrain", SALON_PROFESSIONNEL: "Salon Professionnel", PARTENARIAT: "Partenariat", RECOMMANDATION_CLIENT: "Recommandation Client", VISITE_BUREAU: "Visite Bureau", EMPLOYE_ENARVA: "Employé Enarva", APPEL_TELEPHONIQUE: "Appel Téléphonique", SMS: "SMS", NUMERO_SUR_PUB: "Numéro sur Pub", AFFICHE: "Affiche", FLYER: "Flyer", ENSEIGNE: "Enseigne", VOITURE_SIGLEE: "Voiture Siglée", RADIO: "Radio", ANNONCE_PRESSE: "Annonce Presse", TELE: "Télé", MANUEL: "Manuel", SOURCING_INTERNE: "Sourcing Interne", PORTE_A_PORTE: "Porte à Porte", CHANTIER_EN_COURS: "Chantier en cours" },
  LeadType: { PARTICULIER: "Particulier", PROFESSIONNEL: "Professionnel", PUBLIC: "Public" },
  UrgencyLevel: { NORMAL: "Normal", URGENT: "Urgent", HIGH_URGENT: "Très urgent", IMMEDIATE: "Immédiat" },
  PropertyType: { APARTMENT_SMALL: "Appartement (Petit)", APARTMENT_MEDIUM: "Appartement (Moyen)", APARTMENT_MULTI: "Appartement (Multi-niveaux)", VILLA_LARGE: "Villa (Grande)", COMMERCIAL: "Local Commercial", HOTEL_STANDARD: "Hôtel (Standard)", HOTEL_LUXURY: "Hôtel (Luxe)", OFFICE: "Bureau", RESIDENCE_B2B: "Résidence B2B", RESTAURANT: "Restaurant" },
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
  let subTotalHT = 0;
  const allLineItems: QuoteLineItem[] = [];

  services.forEach(service => {
    const totalSurface = service.surface * service.levels;
    const baseRate = getBaseRate(service.type, totalSurface);
    const prixDeBase = totalSurface * baseRate;

    const coeffs = getCoefficients(service);
    const coeffGlobal = coeffs.distance * coeffs.etage * coeffs.delai * coeffs.difficulte;
    
    const prixFinalServiceHT = prixDeBase * coeffGlobal;
    const majorationAmount = prixFinalServiceHT - prixDeBase;

    allLineItems.push({
      id: `base-${service.id}`,
      description: `Forfait de Base "${service.type}"`,
      detail: `${service.surface}m² x ${service.levels} niveaux = ${totalSurface}m² x ${baseRate} DH/m²`,
      amount: prixDeBase,
      editable: true,
    });

    if (majorationAmount > 0) {
      allLineItems.push({
        id: `majoration-${service.id}`,
        description: "Forfait Prestations Renforcées",
        detail: `Coefficients appliqués (Délai, Difficulté, etc.)`,
        amount: majorationAmount,
        editable: true,
      });
    }
    subTotalHT += prixFinalServiceHT;
  });

  const vatAmount = subTotalHT * 0.20;
  let totalTTC = subTotalHT + vatAmount;

  if (totalTTC < 500) totalTTC = 500;
  
  const finalPrice = Math.round(totalTTC / 10) * 10;

  return { lineItems: allLineItems, subTotalHT, vatAmount, totalTTC, finalPrice };
}