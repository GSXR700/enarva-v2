// lib/validation.ts - ENHANCED VALIDATION WITH ALL MISSING FIELDS AND FIXES
import { z } from 'zod'

// Base schema for the lead object, without refinements.
// This allows us to call .partial() on it for updates.
const completeLeadObjectSchema = z.object({
  // Basic Information (Required)
  firstName: z.string().min(1, 'Prénom requis').max(50, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(50, 'Nom trop long'),
  phone: z.string()
    .min(10, 'Numéro de téléphone requis')
    .max(20, 'Numéro de téléphone invalide')
    .regex(/^[+]?[\d\s\-().]+$/, 'Format de téléphone invalide'),
  email: z.string()
    .email('Format email invalide')
    .optional()
    .or(z.literal(''))
    .transform(val => val === '' ? null : val),

  // Location Information
  address: z.string()
    .max(200, 'Adresse trop longue')
    .optional()
    .transform(val => val === '' ? null : val),
  gpsLocation: z.string()
    .optional()
    .transform(val => val === '' ? null : val),

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
    'SUBCONTRACTOR_LEAD'
  ]).default('NEW'),

  score: z.number()
    .min(0, 'Score minimum: 0')
    .max(100, 'Score maximum: 100')
    .optional()
    .default(0),

  // Professional Information
  leadType: z.enum(['PARTICULIER', 'PROFESSIONNEL', 'PUBLIC', 'NGO', 'SYNDIC', 'OTHER'])
    .default('PARTICULIER'),

  company: z.string()
    .max(100, 'Nom d\'entreprise trop long')
    .optional()
    .transform(val => val === '' ? null : val),

  iceNumber: z.string()
    .max(20, 'Numéro ICE trop long')
    .optional()
    .transform(val => val === '' ? null : val),

  activitySector: z.string()
    .max(100, 'Secteur d\'activité trop long')
    .optional()
    .transform(val => val === '' ? null : val),

  contactPosition: z.string()
    .max(100, 'Poste de contact trop long')
    .optional()
    .transform(val => val === '' ? null : val),

  department: z.string()
    .max(100, 'Département trop long')
    .optional()
    .transform(val => val === '' ? null : val),

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
    .optional()
    .transform(val => val === '' ? null : val),

  frequency: z.enum([
    'PONCTUEL', 'HEBDOMADAIRE', 'MENSUEL', 'BIMENSUEL', 'TRIMESTRIEL',
    'QUARTANNE', 'SEMESTRIEL', 'ANNUEL', 'CONTRAT_CADRE', 'RECURRING', 'AUTRE'
  ]).default('PONCTUEL'),

  contractType: z.enum([
    'INTERVENTION_UNIQUE', 'MAINTENANCE', 'ABONNEMENT', 'CONTRAT_CADRE', 'RECURRING', 'AUTRE'
  ]).default('INTERVENTION_UNIQUE'),

  // Products & Equipment
  needsProducts: z.boolean().default(false),
  needsEquipment: z.boolean().default(false),
  providedBy: z.enum(['ENARVA', 'CLIENT', 'MIXTE']).default('ENARVA'),

  // Materials (Enhanced validation)
  materials: z.object({
    marble: z.boolean().optional(),
    parquet: z.boolean().optional(),
    tiles: z.boolean().optional(),
    carpet: z.boolean().optional(),
    concrete: z.boolean().optional(),
    wood: z.boolean().optional(),
    glass: z.boolean().optional(),
    metal: z.boolean().optional(),
    fabric: z.boolean().optional(),
    leather: z.boolean().optional(),
    other: z.string().max(200, 'Description trop longue').optional()
  }).optional().nullable(),

  // Lead Source
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
    .optional()
    .transform(val => val === '' ? null : val),

  // Referral Information
  hasReferrer: z.boolean().default(false),
  referrerContact: z.string()
    .max(100, 'Contact référent trop long')
    .optional()
    .transform(val => val === '' ? null : val),

  enarvaRole: z.enum(['PRESTATAIRE_PRINCIPAL', 'SOUS_TRAITANT', 'CO_TRAITANT', 'AUTRE'])
    .default('PRESTATAIRE_PRINCIPAL'),

  // Original Message
  originalMessage: z.string()
    .min(1, 'Message original requis')
    .max(2000, 'Message trop long'),

  // Assignment
  assignedToId: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val)
});

// Now, apply refinements to the base schema for complete validation.
export const completeLeadValidationSchema = completeLeadObjectSchema.refine((data) => {
  // Custom validation: if leadType is PROFESSIONNEL, company should be provided
  if (data.leadType === 'PROFESSIONNEL' && !data.company) {
    return false
  }
  return true
}, {
  message: "Le nom de l'entreprise est requis pour les clients professionnels",
  path: ["company"]
}).refine((data) => {
  // Custom validation: if hasReferrer is true, referrerContact should be provided
  if (data.hasReferrer && !data.referrerContact) {
    return false
  }
  return true
}, {
  message: "Les informations du référent sont requises",
  path: ["referrerContact"]
}).refine((data) => {
  // Custom validation: estimated surface validation based on property type
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


// Export the type
export type CompleteLeadInput = z.infer<typeof completeLeadValidationSchema>

// Validation function - FIXED
export function validateCompleteLeadInput(data: any, isCreation = true) {
  if (isCreation) {
    return completeLeadValidationSchema.safeParse(data)
  } else {
    // For updates, create a partial schema from the base object
    // and then re-apply refinements.
    const updateSchema = completeLeadObjectSchema.partial().refine((data) => {
      if (data.leadType === 'PROFESSIONNEL' && data.company === undefined) {
        // If leadType is being changed TO 'PROFESSIONNEL' but company is not provided.
        // This check is tricky in a partial schema. We only validate if the leadType is present.
      } else if (data.leadType === 'PROFESSIONNEL' && !data.company) {
        return false;
      }
      return true;
    }, {
      message: "Le nom de l'entreprise est requis pour les clients professionnels",
      path: ["company"]
    }).refine((data) => {
        // Only validate if hasReferrer is explicitly set in the update
        if (data.hasReferrer === true && !data.referrerContact) {
            return false;
        }
        return true;
    }, {
        message: "Les informations du référent sont requises",
        path: ["referrerContact"]
    });
    return updateSchema.safeParse(data);
  }
}

// Enhanced Mission Validation
export const completeMissionValidationSchema = z.object({
  missionNumber: z.string()
    .min(1, 'Numéro de mission requis')
    .max(50, 'Numéro de mission trop long'),

  status: z.enum([
    'SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'CLIENT_VALIDATION',
    'COMPLETED', 'CANCELLED'
  ]).default('SCHEDULED'),

  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),

  type: z.enum([
    'SERVICE', 'TECHNICAL_VISIT', 'DELIVERY', 'INTERNAL', 'RECURRING'
  ]).default('SERVICE'),

  scheduledDate: z.string()
    .min(1, 'Date programmée requise')
    .refine((date) => {
      try {
        const scheduledDate = new Date(date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        // Check if date is valid
        return !isNaN(scheduledDate.getTime()) && scheduledDate >= now;
      } catch (error) {
        return false;
      }
    }, {
      message: "La date programmée ne peut pas être dans le passé ou est invalide"
    }),


  estimatedDuration: z.number()
    .min(0.5, 'Durée minimale: 30 minutes')
    .max(24, 'Durée maximale: 24 heures'),

  address: z.string()
    .min(1, 'Adresse requise')
    .max(200, 'Adresse trop longue'),

  coordinates: z.string()
    .optional()
    .transform(val => val === '' ? null : val),

  accessNotes: z.string()
    .max(500, 'Notes d\'accès trop longues')
    .optional()
    .transform(val => val === '' ? null : val),

  teamLeaderId: z.string()
    .min(1, 'Chef d\'équipe requis'),

  leadId: z.string()
    .min(1, 'Lead ID requis'),

  quoteId: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  taskTemplateId: z.string()
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  // Additional validation fields
  clientValidated: z.boolean().default(false),
  adminValidated: z.boolean().optional().nullable(),
  qualityScore: z.number()
    .min(1, 'Score qualité minimum: 1')
    .max(5, 'Score qualité maximum: 5')
    .optional()
    .nullable(),

  adminNotes: z.string()
    .max(1000, 'Notes admin trop longues')
    .optional()
    .transform(val => val === '' ? null : val),

  issuesFound: z.string()
    .max(1000, 'Description des problèmes trop longue')
    .optional()
    .transform(val => val === '' ? null : val),

  correctionRequired: z.boolean().default(false)
})

export type CompleteMissionInput = z.infer<typeof completeMissionValidationSchema>

export function validateCompleteMissionInput(data: any) {
  return completeMissionValidationSchema.safeParse(data)
}

// FIXED Enhanced Quote Validation - Main fix here
export const completeQuoteValidationSchema = z.object({
  quoteNumber: z.string()
    .min(1, 'Numéro de devis requis')
    .max(50, 'Numéro de devis trop long')
    .optional(), // Made optional for editing

  leadId: z.string()
    .min(1, 'Lead ID requis')
    .optional(), // Made optional for editing

  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'])
    .default('DRAFT'),

  businessType: z.enum(['SERVICE', 'PRODUCT']).default('SERVICE'),

  lineItems: z.array(z.object({
    id: z.string().optional(),
    description: z.string().min(1, 'Description requise').max(200, 'Description trop longue'),
    detail: z.string().optional(),
    amount: z.number().min(0, 'Montant doit être positif').optional(),
    quantity: z.number().min(0.1, 'Quantité minimale: 0.1').max(1000, 'Quantité trop élevée'),
    unitPrice: z.number().min(0, 'Prix unitaire doit être positif').max(10000, 'Prix unitaire trop élevé'),
    totalPrice: z.number().min(0, 'Prix total doit être positif'),
    unit: z.string().max(20, 'Unité trop longue').optional(),
    serviceType: z.string().max(100, 'Type de service trop long').optional(),
    editable: z.boolean().optional()
  })).min(1, 'Au moins un article requis'),

  subTotalHT: z.number().min(0, 'Sous-total HT doit être positif'),
  vatAmount: z.number().min(0, 'Montant TVA doit être positif'),
  totalTTC: z.number().min(0, 'Total TTC doit être positif'),
  finalPrice: z.number().min(0, 'Prix final doit être positif'),

  expiresAt: z.union([
    z.string(),
    z.date()
  ]).refine((date) => {
      try {
          const expiryDate = new Date(date);
          const now = new Date();
          return !isNaN(expiryDate.getTime()) && expiryDate > now;
      } catch (error) {
          return false;
      }
  }, {
      message: "La date d'expiration doit être dans le futur et valide"
  }).optional(),

  type: z.enum(['STANDARD', 'EXPRESS', 'PREMIUM', 'CUSTOM']).default('STANDARD').optional(),
  surface: z.number().min(0).optional(),

  // Service-specific fields (OPTIONAL for editing)
  services: z.array(z.object({
    type: z.string().min(1, 'Type de service requis'),
    surface: z.number().min(1, 'Surface requise'),
    levels: z.number().min(1, 'Nombre d\'étages requis'),
    distance: z.number().min(0, 'Distance doit être positive'),
    etage: z.string().min(1, 'Étage requis'),
    delai: z.enum(['STANDARD', 'EXPRESS', 'URGENT']),
    difficulte: z.enum(['STANDARD', 'COMPLEX', 'HIGH_DIFFICULTY'])
  })).optional(),

  // Product-specific fields
  productCategory: z.enum([
    'CLEANING_PRODUCTS', 'EQUIPMENT', 'CONSUMABLES', 'PROTECTIVE_GEAR'
  ]).optional(),

  productDetails: z.string()
    .max(1000, 'Détails produit trop longs')
    .optional(),

  // Lead updates that can be made from quote
  leadUpdates: z.object({
    estimatedSurface: z.number().min(1).max(10000).optional(),
    propertyType: z.enum([
    'APARTMENT_SMALL', 'APARTMENT_MEDIUM', 'APARTMENT_MULTI', 'APARTMENT_LARGE',
    'VILLA_SMALL', 'VILLA_MEDIUM', 'VILLA_LARGE', 'PENTHOUSE',
    'COMMERCIAL', 'STORE', 'HOTEL_STANDARD', 'HOTEL_LUXURY', 'OFFICE',
    'RESIDENCE_B2B', 'BUILDING', 'RESTAURANT', 'WAREHOUSE', 'OTHER'
     ]).optional(),
    address: z.string().max(200).optional(),
    urgencyLevel: z.enum(['LOW', 'NORMAL', 'URGENT', 'HIGH_URGENT', 'IMMEDIATE']).optional(),
    budgetRange: z.string().max(50).optional()
  }).optional()
}).refine((data) => {
  // FIXED: Check lineItems instead of services for SERVICE business type
  if (data.businessType === 'SERVICE') {
    return data.lineItems && data.lineItems.length > 0
  }
  return true
}, {
  message: "Au moins un élément de service est requis pour un devis de service",
  path: ["lineItems"] // Changed from "services" to "lineItems"
}).refine((data) => {
  // Custom validation for product quotes
  if (data.businessType === 'PRODUCT') {
    return data.productCategory && data.lineItems && data.lineItems.length > 0
  }
  return true
}, {
  message: "La catégorie produit et les articles sont requis pour un devis de produit",
  path: ["productCategory"]
}).refine((data) => {
  // Validate line items total matches calculated totals
  if(data.lineItems && data.lineItems.length > 0) {
    const calculatedSubTotal = data.lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const tolerance = 0.01 // Allow small rounding differences
    return Math.abs(calculatedSubTotal - data.subTotalHT) <= tolerance
  }
  return true;
}, {
  message: "Le sous-total ne correspond pas à la somme des articles",
  path: ["subTotalHT"]
})

export type CompleteQuoteInput = z.infer<typeof completeQuoteValidationSchema>

export function validateCompleteQuoteInput(data: any) {
  return completeQuoteValidationSchema.safeParse(data)
}

// Enhanced Team Member Validation
export const completeTeamMemberValidationSchema = z.object({
  // User information
  name: z.string()
    .min(1, 'Nom requis')
    .max(100, 'Nom trop long'),

  email: z.string()
    .email('Format email invalide')
    .max(100, 'Email trop long'),

  password: z.string()
    .min(8, 'Mot de passe minimum 8 caractères')
    .max(100, 'Mot de passe trop long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),

  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']),

  // Team member specific information
  teamId: z.string()
    .min(1, 'ID d\'équipe requis'),

  specialties: z.array(z.enum([
    'GENERAL_CLEANING', 'WINDOW_SPECIALIST', 'FLOOR_SPECIALIST',
    'LUXURY_SURFACES', 'EQUIPMENT_HANDLING', 'TEAM_MANAGEMENT',
    'QUALITY_CONTROL', 'DETAIL_FINISHING'
  ])).default([]),

  experience: z.enum(['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']),

  availability: z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION'])
    .default('AVAILABLE'),

  hourlyRate: z.number()
    .min(0, 'Taux horaire doit être positif')
    .max(1000, 'Taux horaire trop élevé')
    .optional()
    .nullable(),

  isActive: z.boolean().default(true)
}).refine((data) => {
  // Custom validation: senior/expert roles should have hourly rate
  if (['SENIOR', 'EXPERT'].includes(data.experience) && !data.hourlyRate) {
    return false
  }
  return true
}, {
  message: "Un taux horaire est requis pour les niveaux Senior et Expert",
  path: ["hourlyRate"]
}).refine((data) => {
  // Custom validation: team leaders should have management specialty
  if (data.role === 'TEAM_LEADER' && !data.specialties.includes('TEAM_MANAGEMENT')) {
    return false
  }
  return true
}, {
  message: "Les chefs d'équipe doivent avoir la spécialité 'Gestion d'équipe'",
  path: ["specialties"]
})

export type CompleteTeamMemberInput = z.infer<typeof completeTeamMemberValidationSchema>

export function validateCompleteTeamMemberInput(data: any) {
  return completeTeamMemberValidationSchema.safeParse(data)
}

// Field Report Validation
export const completeFieldReportValidationSchema = z.object({
  missionId: z.string()
    .min(1, 'Mission ID requis'),

  generalObservations: z.string()
    .max(2000, 'Observations générales trop longues')
    .optional()
    .transform(val => val === '' ? null : val),

  clientFeedback: z.string()
    .max(2000, 'Retour client trop long')
    .optional()
    .transform(val => val === '' ? null : val),

  issuesEncountered: z.string()
    .max(2000, 'Description des problèmes trop longue')
    .optional()
    .transform(val => val === '' ? null : val),

  materialsUsed: z.any()
    .optional()
    .nullable(),

  hoursWorked: z.number()
    .min(0.1, 'Minimum 0.1 heure')
    .max(24, 'Maximum 24 heures'),

  beforePhotos: z.array(z.string().url('URL de photo invalide'))
    .default([]),

  afterPhotos: z.array(z.string().url('URL de photo invalide'))
    .default([]),

  clientSignatureUrl: z.string()
    .url('URL de signature invalide')
    .min(1, 'Signature client requise'),

  teamLeadSignatureUrl: z.string()
    .url('URL de signature invalide')
    .min(1, 'Signature chef d\'équipe requise'),

  additionalNotes: z.string()
    .max(2000, 'Notes supplémentaires trop longues')
    .optional()
    .transform(val => val === '' ? null : val)
}).refine((data) => {
  // Custom validation: at least one photo should be provided
  if (data.beforePhotos.length === 0 && data.afterPhotos.length === 0) {
    return false
  }
  return true
}, {
  message: "Au moins une photo (avant ou après) est requise",
  path: ["beforePhotos"]
})

export type CompleteFieldReportInput = z.infer<typeof completeFieldReportValidationSchema>

export function validateCompleteFieldReportInput(data: any) {
  return completeFieldReportValidationSchema.safeParse(data)
}

// Subscription Validation
export const completeSubscriptionValidationSchema = z.object({
  leadId: z.string()
    .min(1, 'Lead ID requis'),

  type: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'CUSTOM']),

  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'])
    .default('ACTIVE'),

  monthlyPrice: z.number()
    .min(0.01, 'Prix mensuel minimum: 0.01€')
    .max(10000, 'Prix mensuel maximum: 10000€'),

  discount: z.number()
    .min(0, 'Remise minimum: 0%')
    .max(100, 'Remise maximum: 100%')
    .default(0),

  nextBilling: z.string()
    .refine((date) => {
      try {
        const billingDate = new Date(date);
        const now = new Date();
        return !isNaN(billingDate.getTime()) && billingDate > now;
      } catch (error) {
        return false;
      }
    }, {
      message: "La prochaine facturation doit être dans le futur et valide"
    }),

  includedServices: z.number()
    .min(1, 'Nombre de services minimum: 1')
    .max(100, 'Nombre de services maximum: 100'),

  usedServices: z.number()
    .min(0, 'Services utilisés minimum: 0')
    .default(0)
}).refine((data) => {
  // Custom validation: used services cannot exceed included services
  return data.usedServices <= data.includedServices
}, {
  message: "Les services utilisés ne peuvent pas dépasser les services inclus",
  path: ["usedServices"]
})

export type CompleteSubscriptionInput = z.infer<typeof completeSubscriptionValidationSchema>

export function validateCompleteSubscriptionInput(data: any) {
  return completeSubscriptionValidationSchema.safeParse(data)
}

// Data cleaning utility functions
export function cleanLeadData(data: any): any {
  const cleaned = { ...data }

  // Convert empty strings to null for optional fields
  const optionalFields = [
    'email', 'address', 'gpsLocation', 'company', 'iceNumber',
    'activitySector', 'contactPosition', 'department', 'source',
    'referrerContact', 'budgetRange'
  ]

  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null
    }
  })

  // Convert string numbers to actual numbers
  if (cleaned.estimatedSurface) {
    const surface = parseFloat(cleaned.estimatedSurface);
    cleaned.estimatedSurface = isNaN(surface) ? null : surface;
  }

  if (cleaned.score) {
    const score = parseInt(cleaned.score, 10);
    cleaned.score = isNaN(score) ? 0 : score;
  }

  // Handle boolean fields
  ['needsProducts', 'needsEquipment', 'hasReferrer'].forEach(field => {
    if (typeof cleaned[field] === 'string') {
      cleaned[field] = cleaned[field].toLowerCase() === 'true'
    }
  })

  return cleaned
}

export function cleanMissionData(data: any): any {
  const cleaned = { ...data }

  // Convert string numbers to actual numbers
  if (cleaned.estimatedDuration) {
    const duration = parseFloat(cleaned.estimatedDuration);
    cleaned.estimatedDuration = isNaN(duration) ? null : duration;
  }

  if (cleaned.qualityScore) {
    const score = parseInt(cleaned.qualityScore, 10);
    cleaned.qualityScore = isNaN(score) ? null : score;
  }

  // Handle boolean fields
  ['clientValidated', 'adminValidated', 'correctionRequired'].forEach(field => {
    if (typeof cleaned[field] === 'string') {
      cleaned[field] = cleaned[field].toLowerCase() === 'true'
    }
  })

  // Convert empty strings to null
  const optionalFields = [
    'coordinates', 'accessNotes', 'quoteId', 'taskTemplateId',
    'adminNotes', 'issuesFound'
  ]

  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null
    }
  })

  return cleaned
}

export function cleanQuoteData(data: any): any {
  const cleaned = { ...data }

  // Convert string numbers to actual numbers
  if (cleaned.surface) {
    const surface = parseFloat(cleaned.surface);
    cleaned.surface = isNaN(surface) ? null : surface;
  }

  if (cleaned.finalPrice) {
    const price = parseFloat(cleaned.finalPrice);
    cleaned.finalPrice = isNaN(price) ? 0 : price;
  }

  if (cleaned.subTotalHT) {
    const subtotal = parseFloat(cleaned.subTotalHT);
    cleaned.subTotalHT = isNaN(subtotal) ? 0 : subtotal;
  }

  if (cleaned.vatAmount) {
    const vat = parseFloat(cleaned.vatAmount);
    cleaned.vatAmount = isNaN(vat) ? 0 : vat;
  }

  if (cleaned.totalTTC) {
    const total = parseFloat(cleaned.totalTTC);
    cleaned.totalTTC = isNaN(total) ? 0 : total;
  }

  // Handle lineItems array
  if (cleaned.lineItems && Array.isArray(cleaned.lineItems)) {
    cleaned.lineItems = cleaned.lineItems.map((item: any) => ({
      ...item,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      totalPrice: parseFloat(item.totalPrice) || 0,
      amount: parseFloat(item.amount) || parseFloat(item.totalPrice) || 0
    }));
  }

  // Convert empty strings to null for optional fields
  const optionalFields = [
    'productDetails', 'deliveryAddress', 'deliveryNotes'
  ]

  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null
    }
  })

  return cleaned
}

export function cleanTeamMemberData(data: any): any {
  const cleaned = { ...data }

  // Convert string numbers to actual numbers
  if (cleaned.hourlyRate) {
    const rate = parseFloat(cleaned.hourlyRate);
    cleaned.hourlyRate = isNaN(rate) ? null : rate;
  }

  // Handle boolean fields
  ['isActive'].forEach(field => {
    if (typeof cleaned[field] === 'string') {
      cleaned[field] = cleaned[field].toLowerCase() === 'true'
    }
  })

  // Ensure specialties is an array
  if (cleaned.specialties && !Array.isArray(cleaned.specialties)) {
    cleaned.specialties = [];
  }

  return cleaned
}

// Error formatting utility
export function formatValidationErrors(errors: z.ZodIssue[]): string[] {
  return errors.map(error => {
    const path = error.path.join('.')
    return `${path}: ${error.message}`
  })
}

// Additional validation helpers
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  const phoneRegex = /^[+]?[\d\s\-().]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
}

export function validateDateNotInPast(date: string | Date): boolean {
  try {
    const inputDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return !isNaN(inputDate.getTime()) && inputDate >= now;
  } catch {
    return false;
  }
}

// Type exports for convenience
export type CreateMissionInput = CompleteMissionInput;
export type CreateQuoteInput = CompleteQuoteInput;
export type CreateLeadInput = CompleteLeadInput;
export type CreateTeamMemberInput = CompleteTeamMemberInput;
export type CreateFieldReportInput = CompleteFieldReportInput;
export type CreateSubscriptionInput = CompleteSubscriptionInput;