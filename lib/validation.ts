// lib/validation.ts - Added missing validation functions
import { z } from 'zod';

// Lead validation schema
export const leadValidationSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(50, 'Nom trop long'),
  phone: z.string().min(8, 'Numéro de téléphone invalide').max(20, 'Numéro trop long'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  address: z.string().max(200, 'Adresse trop longue').optional(),
  gpsLocation: z.string().optional(),
  
  leadType: z.enum(['PARTICULIER', 'PROFESSIONNEL', 'PUBLIC']),
  company: z.string().max(100, 'Nom de société trop long').optional(),
  iceNumber: z.string().max(20, 'Numéro ICE trop long').optional(),
  activitySector: z.string().max(100, 'Secteur d\'activité trop long').optional(),
  contactPosition: z.string().max(50, 'Poste trop long').optional(),
  department: z.string().max(50, 'Département trop long').optional(),
  
  propertyType: z.enum([
    'APARTMENT_SMALL', 'APARTMENT_MEDIUM', 'APARTMENT_MULTI', 'APARTMENT_LARGE',
    'VILLA_SMALL', 'VILLA_MEDIUM', 'VILLA_LARGE', 'PENTHOUSE',
    'COMMERCIAL', 'STORE', 'HOTEL_STANDARD', 'HOTEL_LUXURY',
    'OFFICE', 'RESIDENCE_B2B', 'BUILDING', 'RESTAURANT', 'WAREHOUSE', 'OTHER'
  ]).optional(),
  
  estimatedSurface: z.number().min(0, 'Surface invalide').max(100000, 'Surface trop grande').optional(),
  accessibility: z.enum(['EASY', 'MEDIUM', 'DIFFICULT', 'VERY_DIFFICULT']).optional(),
  urgencyLevel: z.enum(['LOW', 'NORMAL', 'URGENT', 'HIGH_URGENT', 'IMMEDIATE']).optional(),
  budgetRange: z.string().optional(),
  frequency: z.enum(['PONCTUEL', 'MENSUEL', 'ANNUEL', 'CONTRAT_CADRE']).optional(),
  contractType: z.enum(['INTERVENTION_UNIQUE', 'MAINTENANCE', 'ABONNEMENT']).optional(),
  
  needsProducts: z.boolean().optional(),
  needsEquipment: z.boolean().optional(),
  providedBy: z.enum(['ENARVA', 'CLIENT']).optional(),
  
  channel: z.enum([
    'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'GOOGLE_MAPS',
    'GOOGLE_SEARCH', 'SITE_WEB', 'FORMULAIRE_SITE', 'MARKETPLACE',
    'YOUTUBE', 'EMAIL', 'APPORTEUR_AFFAIRES', 'COMMERCIAL_TERRAIN',
    'SALON_PROFESSIONNEL', 'PARTENARIAT', 'RECOMMANDATION_CLIENT',
    'VISITE_BUREAU', 'EMPLOYE_ENARVA', 'APPEL_TELEPHONIQUE', 'SMS',
    'NUMERO_SUR_PUB', 'AFFICHE', 'FLYER', 'ENSEIGNE', 'VOITURE_SIGLEE',
    'RADIO', 'ANNONCE_PRESSE', 'TELE', 'MANUEL', 'SOURCING_INTERNE',
    'PORTE_A_PORTE', 'CHANTIER_EN_COURS'
  ]),
  
  source: z.string().max(100, 'Source trop longue').optional(),
  hasReferrer: z.boolean().optional(),
  referrerContact: z.string().max(100, 'Contact référent trop long').optional(),
  enarvaRole: z.enum(['PRESTATAIRE_PRINCIPAL', 'SOUS_TRAITANT']).optional(),
  
  originalMessage: z.string().max(2000, 'Message trop long').optional(),
  status: z.enum([
    'NEW', 'TO_QUALIFY', 'WAITING_INFO', 'QUALIFIED', 'VISIT_PLANNED',
    'ON_VISIT', 'VISIT_DONE', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REFUSED',
    'MISSION_SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'INTERVENTION_PLANNED',
    'INTERVENTION_IN_PROGRESS', 'INTERVENTION_DONE', 'QUALITY_CONTROL',
    'CLIENT_TO_CONFIRM_END', 'CLIENT_CONFIRMED', 'DELIVERY_PLANNED',
    'DELIVERY_DONE', 'SIGNED_DELIVERY_NOTE', 'PENDING_PAYMENT',
    'PAID_OFFICIAL', 'PAID_CASH', 'REFUNDED', 'PENDING_REFUND',
    'FOLLOW_UP_SENT', 'UPSELL_IN_PROGRESS', 'UPSELL_CONVERTED',
    'REWORK_PLANNED', 'REWORK_DONE', 'UNDER_WARRANTY', 'AFTER_SALES_SERVICE',
    'CLIENT_ISSUE', 'IN_DISPUTE', 'CLIENT_PAUSED', 'LEAD_LOST',
    'CANCELLED', 'CANCELED_BY_CLIENT', 'CANCELED_BY_ENARVA',
    'INTERNAL_REVIEW', 'AWAITING_PARTS', 'CONTRACT_SIGNED',
    'UNDER_CONTRACT', 'SUBCONTRACTED', 'OUTSOURCED', 'WAITING_THIRD_PARTY',
    'PRODUCT_ONLY', 'PRODUCT_SUPPLIER', 'DELIVERY_ONLY', 'AFFILIATE_LEAD',
    'SUBCONTRACTOR_LEAD'
  ]).optional(),
  
  assignedToId: z.string().optional(),
  materials: z.any().optional(), // JSON field
  score: z.number().min(0).max(100).optional(),
});

export function validateLeadInput(data: any) {
  return leadValidationSchema.safeParse(data);
}

// Mission validation schema
export const missionValidationSchema = z.object({
  missionNumber: z.string().min(1, 'Numéro de mission requis'),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'CLIENT_VALIDATION', 'COMPLETED', 'CANCELLED']),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
  type: z.enum(['SERVICE', 'TECHNICAL_VISIT', 'DELIVERY', 'INTERNAL', 'RECURRING']),
  scheduledDate: z.string().or(z.date()),
  estimatedDuration: z.number().min(1, 'Durée estimée requise'),
  address: z.string().min(1, 'Adresse requise'),
  coordinates: z.string().optional(),
  accessNotes: z.string().optional(),
  teamLeaderId: z.string().optional(),
  leadId: z.string().min(1, 'Lead ID requis'),
  quoteId: z.string().optional(),
});

export function validateMissionInput(data: any) {
  return missionValidationSchema.safeParse(data);
}

// Task validation schema
export const taskValidationSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(100, 'Titre trop long'),
  description: z.string().max(500, 'Description trop longue').optional(),
  category: z.enum([
    'EXTERIOR_FACADE', 'WALLS_BASEBOARDS', 'FLOORS', 'STAIRS',
    'WINDOWS_JOINERY', 'KITCHEN', 'BATHROOM_SANITARY', 'LIVING_SPACES',
    'LOGISTICS_ACCESS'
  ]),
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'REJECTED']),
  missionId: z.string().min(1, 'Mission ID requis'),
  assignedToId: z.string().optional(),
  estimatedTime: z.number().min(0).optional(),
  actualTime: z.number().min(0).optional(),
  notes: z.string().max(1000, 'Notes trop longues').optional(),
});

export function validateTaskInput(data: any) {
  return taskValidationSchema.safeParse(data);
}

// Quote validation schema
export const quoteValidationSchema = z.object({
  quoteNumber: z.string().min(1, 'Numéro de devis requis'),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
  type: z.enum(['EXPRESS', 'STANDARD', 'PREMIUM']),
  totalPrice: z.number().min(0, 'Prix total invalide'),
  validUntil: z.string().or(z.date()),
  leadId: z.string().min(1, 'Lead ID requis'),
  services: z.array(z.any()).optional(), // JSON field
  lineItems: z.array(z.any()).optional(), // JSON field
});

export function validateQuoteInput(data: any) {
  return quoteValidationSchema.safeParse(data);
}

// User validation schema
export const userValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(50, 'Nom trop long'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']),
  image: z.string().url('URL d\'image invalide').optional(),
});

export function validateUserInput(data: any) {
  return userValidationSchema.safeParse(data);
}

// Expense validation schema
export const expenseValidationSchema = z.object({
  date: z.string().or(z.date()),
  amount: z.number().min(0, 'Montant invalide'),
  category: z.enum(['FUEL', 'EQUIPMENT', 'MATERIALS', 'MEALS', 'ACCOMMODATION', 'OTHER']),
  subCategory: z.string().min(1, 'Sous-catégorie requise'),
  paymentMethod: z.enum(['CASH', 'CARD', 'TRANSFER', 'CHECK']),
  vendor: z.string().optional(),
  description: z.string().max(500, 'Description trop longue').optional(),
  proofUrl: z.string().url('URL de justificatif invalide').optional(),
  missionId: z.string().optional(),
  leadId: z.string().optional(),
  userId: z.string().min(1, 'User ID requis'),
});

export function validateExpenseInput(data: any) {
  return expenseValidationSchema.safeParse(data);
}