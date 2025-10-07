// lib/validations/lead-validation.ts - FOCUSED LEAD VALIDATION
import { z } from 'zod';
import { ServiceType } from '@prisma/client';

// =============================================================================
// LEAD VALIDATION SCHEMAS
// =============================================================================

const baseLeadSchema = z.object({
  // Basic Information (Required)
  firstName: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(50, 'Nom trop long'),
  phone: z.string()
    .min(1, 'Numéro de téléphone requis')
    .max(50, 'Numéro de téléphone invalide')
    .refine((phone) => {
      if (phone === 'À renseigner' || phone === 'Non renseigné') return true;
      const phoneRegex = /^[+]?[\d\s\-().]+$/;
      return phoneRegex.test(phone) && phone.length >= 10;
    }, 'Format de téléphone invalide'),
  
  email: z.string()
    .email('Format email invalide')
    .nullable()
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' || val === undefined ? null : val),

  // Location Information
  address: z.string()
    .max(200, 'Adresse trop longue')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),
  
  gpsLocation: z.string()
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  // Lead Management
  status: z.enum([
    'NEW', 'TO_QUALIFY', 'WAITING_INFO', 'QUALIFIED', 'VISIT_PLANNED', 'ON_VISIT',
    'VISIT_DONE', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'QUOTE_REFUSED', 'MISSION_SCHEDULED',
    'IN_PROGRESS', 'COMPLETED', 'INTERVENTION_PLANNED', 'INTERVENTION_IN_PROGRESS',
    'INTERVENTION_DONE', 'QUALITY_CONTROL', 'CLIENT_TO_CONFIRM_END', 'CLIENT_CONFIRMED',
    'DELIVERY_PLANNED', 'DELIVERY_DONE', 'SIGNED_DELIVERY_NOTE', 'PENDING_PAYMENT',
    'PAID_OFFICIAL', 'PAID_CASH', 'REFUNDED', 'PENDING_REFUND', 'FOLLOW_UP_SENT',
    'UPSELL_IN_PROGRESS', 'UPSELL_CONVERTED', 'REWORK_PLANNED', 'REWORK_DONE',
    'UNDER_WARRANTY', 'AFTER_SALES_SERVICE', 'CLIENT_ISSUE', 'IN_DISPUTE',
    'CLIENT_PAUSED', 'LEAD_LOST', 'CANCELLED', 'CANCELED_BY_CLIENT',
    'CANCELED_BY_ENARVA', 'INTERNAL_REVIEW', 'AWAITING_PARTS', 'CONTRACT_SIGNED',
    'UNDER_CONTRACT', 'SUBCONTRACTED', 'OUTSOURCED', 'WAITING_THIRD_PARTY',
    'PRODUCT_ONLY', 'PRODUCT_SUPPLIER', 'DELIVERY_ONLY', 'AFFILIATE_LEAD',
    'SUBCONTRACTOR_LEAD', 'CONVERTED_CLIENT', 'ARCHIVED', 'LOST'
  ]).default('NEW'),

  score: z.number()
    .min(0, 'Score minimum: 0')
    .max(100, 'Score maximum: 100')
    .optional()
    .default(0),

  serviceType: z.nativeEnum(ServiceType).optional().nullable(),

  // Professional Information
  leadType: z.enum(['PARTICULIER', 'PROFESSIONNEL', 'PUBLIC', 'NGO', 'SYNDIC', 'OTHER'])
    .default('PARTICULIER'),

  company: z.string()
    .max(100, 'Nom d\'entreprise trop long')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  iceNumber: z.string()
    .max(20, 'Numéro ICE trop long')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  activitySector: z.string()
    .max(100, 'Secteur d\'activité trop long')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  contactPosition: z.string()
    .max(100, 'Poste de contact trop long')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  department: z.string()
    .max(100, 'Département trop long')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  // Property Information
  propertyType: z.enum([
    'APARTMENT_SMALL', 'APARTMENT_MEDIUM', 'APARTMENT_MULTI', 'APARTMENT_LARGE',
    'VILLA_SMALL', 'VILLA_MEDIUM', 'VILLA_LARGE', 'PENTHOUSE',
    'COMMERCIAL', 'STORE', 'HOTEL_STANDARD', 'HOTEL_LUXURY', 'OFFICE',
    'RESIDENCE_B2B', 'BUILDING', 'RESTAURANT', 'WAREHOUSE', 'OTHER'
  ]).optional().nullable(),

  estimatedSurface: z.number()
    .min(1, 'Surface estimée doit être positive')
    .max(10000, 'Surface trop grande')
    .optional()
    .nullable(),

  accessibility: z.enum(['EASY', 'MEDIUM', 'MODERATE', 'DIFFICULT', 'VERY_DIFFICULT'])
    .default('EASY'),

  // Service Requirements
  urgencyLevel: z.enum(['LOW', 'NORMAL', 'URGENT', 'HIGH_URGENT', 'IMMEDIATE'])
    .optional()
    .nullable(),

  budgetRange: z.string()
    .max(50, 'Gamme de budget trop longue')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  frequency: z.enum(['PONCTUEL', 'HEBDOMADAIRE', 'BIMENSUEL', 'MENSUEL', 'TRIMESTRIEL', 'ANNUEL', 'PERSONNALISE'])
    .default('PONCTUEL'),

  contractType: z.enum(['INTERVENTION_UNIQUE', 'CONTRAT_PONCTUEL', 'ABONNEMENT_REGULIER', 'CONTRAT_ENTREPRISE', 'AUTRE'])
    .default('INTERVENTION_UNIQUE'),

  needsProducts: z.boolean().default(false),
  needsEquipment: z.boolean().default(false),

  // Business Information
  providedBy: z.enum(['ENARVA', 'PARTNER', 'SUBCONTRACTOR', 'UNKNOWN']).default('ENARVA'),
  
  channel: z.enum([
    'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'GOOGLE_MAPS', 'GOOGLE_SEARCH',
    'SITE_WEB', 'FORMULAIRE_SITE', 'MARKETPLACE', 'YOUTUBE', 'EMAIL',
    'APPORTEUR_AFFAIRES', 'COMMERCIAL_TERRAIN', 'SALON_PROFESSIONNEL', 'PARTENARIAT',
    'RECOMMANDATION_CLIENT', 'VISITE_BUREAU', 'EMPLOYE_ENARVA', 'APPEL_TELEPHONIQUE',
    'SMS', 'NUMERO_SUR_PUB', 'AFFICHE', 'FLYER', 'ENSEIGNE', 'VOITURE_SIGLEE',
    'RADIO', 'ANNONCE_PRESSE', 'TELE', 'MANUEL', 'SOURCING_INTERNE', 'PORTE_A_PORTE',
    'CHANTIER_EN_COURS'
  ]),
  
  source: z.string()
    .max(100, 'Source trop longue')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  hasReferrer: z.boolean().default(false),
  referrerContact: z.string()
    .max(200, 'Contact référent trop long')
    .nullable()
    .optional()
    .transform(val => val === '' || val === undefined ? null : val),

  enarvaRole: z.enum(['PRESTATAIRE_PRINCIPAL', 'SOUS_TRAITANT', 'PARTENAIRE', 'CONSEIL_UNIQUEMENT'])
    .default('PRESTATAIRE_PRINCIPAL'),

  originalMessage: z.string().min(1, 'Message original requis'),

  // System fields
  assignedToId: z.string().nullable().optional(),
  materials: z.any().optional().nullable(),
  assignedTo: z.any().optional(),
  activities: z.any().optional()
});

// Complete lead validation with refinements
export const completeLeadValidationSchema = baseLeadSchema.refine((data) => {
  if (data.leadType === 'PROFESSIONNEL' && !data.company) {
    return false
  }
  return true
}, {
  message: "Le nom de l'entreprise est requis pour les clients professionnels",
  path: ["company"]
}).refine((data) => {
  if (data.hasReferrer && !data.referrerContact) {
    return false
  }
  return true
}, {
  message: "Les informations du référent sont requises",
  path: ["referrerContact"]
}).refine((data) => {
  if (data.propertyType && ['WAREHOUSE', 'BUILDING', 'HOTEL_LUXURY'].includes(data.propertyType)) {
    if (!data.estimatedSurface || data.estimatedSurface < 100) {
      return false
    }
  }
  return true
}, {
  message: "Une surface estimée d'au moins 100m² est requise pour ce type de propriété",
  path: ["estimatedSurface"]
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanLeadData(data: any): any {
  const cleaned = { ...data }

  const nullableFields = [
    'email', 'address', 'gpsLocation', 'company', 'iceNumber',
    'activitySector', 'contactPosition', 'department', 'source',
    'referrerContact', 'budgetRange', 'serviceType'
  ]

  nullableFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === undefined || cleaned[field] === 'NONE') {
      cleaned[field] = null
    }
  })

  if (cleaned.estimatedSurface !== null && cleaned.estimatedSurface !== undefined) {
    const surface = parseFloat(cleaned.estimatedSurface);
    cleaned.estimatedSurface = isNaN(surface) ? null : surface;
  }

  if (cleaned.score !== null && cleaned.score !== undefined) {
    const score = parseInt(cleaned.score, 10);
    cleaned.score = isNaN(score) ? 0 : score;
  }

  ['needsProducts', 'needsEquipment', 'hasReferrer'].forEach(field => {
    if (cleaned[field] !== null && cleaned[field] !== undefined) {
      if (typeof cleaned[field] === 'string') {
        cleaned[field] = cleaned[field].toLowerCase() === 'true'
      }
    }
  })

  if (cleaned.assignedToId === '' || cleaned.assignedToId === 'null') {
    cleaned.assignedToId = null
  }

  delete cleaned.createdAt;
  delete cleaned.updatedAt;
  delete cleaned.activities;
  delete cleaned.assignedTo;

  return cleaned
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteLeadInput(data: any, isCreation = true) {
  if (isCreation) {
    return completeLeadValidationSchema.safeParse(cleanLeadData(data))
  } else {
    const updateSchema = baseLeadSchema.partial().refine((data) => {
      if (data.leadType === 'PROFESSIONNEL' && data.company === null) {
        return false;
      }
      return true;
    }, {
      message: "Le nom de l'entreprise est requis pour les clients professionnels",
      path: ["company"]
    }).refine((data) => {
      if (data.hasReferrer === true && !data.referrerContact) {
        return false;
      }
      return true;
    }, {
      message: "Les informations du référent sont requises",
      path: ["referrerContact"]
    });
    
    return updateSchema.safeParse(cleanLeadData(data));
  }
}

export function validateLeadCreation(data: any) {
  return completeLeadValidationSchema.safeParse(cleanLeadData(data));
}

export function validateLeadUpdate(data: any) {
  return baseLeadSchema.partial().safeParse(cleanLeadData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteLeadInput = z.infer<typeof completeLeadValidationSchema>;
export type LeadUpdateInput = z.infer<typeof baseLeadSchema>;
export type CreateLeadInput = CompleteLeadInput;