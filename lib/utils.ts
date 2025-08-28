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
  LeadStatus: { NEW: "Nouveau", QUALIFIED: "Qualifié", QUOTE_SENT: "Devis envoyé", QUOTE_ACCEPTED: "Devis accepté", MISSION_SCHEDULED: "Mission planifiée", IN_PROGRESS: "En cours", COMPLETED: "Terminé", CANCELLED: "Annulé" },
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
    return translations[key]?.[value] || value;
}


export function calculateQuotePrice({
  surface,
  propertyType,
  materials,
  levels,
  distance,
  accessibility,
  urgency,
}: {
  surface: number
  propertyType: string
  materials: string
  levels: number
  distance: number
  accessibility: string
  urgency: string
}) {
  // Base prices per property type (MAD per m²)
  const basePrices: Record<string, number> = {
    APARTMENT_SMALL: 30,    // ≤100m²
    APARTMENT_MEDIUM: 22,   // 100-300m²
    APARTMENT_MULTI: 18,    // multi-levels
    VILLA_LARGE: 18,        // ≥300m²
    COMMERCIAL: 30,         // 25-35 MAD/m²
    HOTEL_STANDARD: 22,     // 18-25 MAD/m²
    HOTEL_LUXURY: 42,       // 35-50 MAD/m²
    OFFICE: 28,
    RESIDENCE_B2B: 15,      // Volume discount
  }

  // Coefficients
  const materialCoefficients: Record<string, number> = {
    STANDARD: 1.0, MARBLE: 1.15, PARQUET: 1.15, LUXURY: 1.35, MIXED: 1.1,
  }
  const levelCoefficients: Record<number, number> = { 1: 1.0, 2: 0.95, 3: 0.9, 4: 0.85, }
  const distanceCoefficients = { local: 1.0, near: 1.1, far: 1.2, very_far: 1.4 }
  const accessibilityCoefficients: Record<string, number> = { EASY: 1.0, MEDIUM: 1.15, DIFFICULT: 1.35, VERY_DIFFICULT: 1.6, }
  const urgencyCoefficients: Record<string, number> = { NORMAL: 1.0, URGENT: 1.2, HIGH: 1.5, IMMEDIATE: 2.5, }

  // Calculate base price
  const basePrice = basePrices[propertyType] || 25

  // Get distance coefficient
  let distanceCoeff = 1.0
  if (distance < 10) distanceCoeff = distanceCoefficients.local
  else if (distance < 30) distanceCoeff = distanceCoefficients.near
  else if (distance < 50) distanceCoeff = distanceCoefficients.far
  else distanceCoeff = distanceCoefficients.very_far

  // Calculate final price
  const finalPrice = surface * basePrice *
    (materialCoefficients[materials] || 1.0) *
    (levelCoefficients[levels] || 0.8) *
    distanceCoeff *
    (accessibilityCoefficients[accessibility] || 1.0) *
    (urgencyCoefficients[urgency] || 1.0)

  return {
    basePrice: surface * basePrice,
    finalPrice: Math.round(finalPrice),
    coefficients: {
      materials: materialCoefficients[materials],
      levels: levelCoefficients[levels] || 0.8,
      distance: distanceCoeff,
      accessibility: accessibilityCoefficients[accessibility],
      urgency: urgencyCoefficients[urgency],
    }
  }
}