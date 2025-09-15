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
// =============================================================================
// MISSING SCHEMAS - ADD THESE TO YOUR EXISTING FILE
// =============================================================================

// User & Authentication Schemas
export const userValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long').optional(),
  email: z.string().email('Format email invalide').max(100, 'Email trop long'),
  hashedPassword: z.string().min(8, 'Mot de passe minimum 8 caractères').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']).default('TECHNICIAN'),
  onlineStatus: z.string().default('OFFLINE'),
  lastSeen: z.date().optional(),
  pushSubscription: z.any().optional()
});

export const accountValidationSchema = z.object({
  userId: z.string().min(1, 'User ID requis'),
  type: z.string().min(1, 'Type requis'),
  provider: z.string().min(1, 'Provider requis'),
  providerAccountId: z.string().min(1, 'Provider Account ID requis'),
  refresh_token: z.string().optional(),
  access_token: z.string().optional(),
  expires_at: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional()
});

export const sessionValidationSchema = z.object({
  sessionToken: z.string().min(1, 'Session token requis'),
  userId: z.string().min(1, 'User ID requis'),
  expires: z.date()
});

// Team Schemas
export const teamValidationSchema = z.object({
  name: z.string().min(2, 'Nom d\'équipe minimum 2 caractères').max(100, 'Nom d\'équipe trop long'),
  description: z.string().max(500, 'Description trop longue').optional().transform(val => val === '' ? null : val)
});

export const teamMemberValidationSchema = z.object({
  userId: z.string().min(1, 'User ID requis'),
  teamId: z.string().min(1, 'Team ID requis'),
  specialties: z.array(z.enum([
    'GENERAL_CLEANING', 'WINDOW_SPECIALIST', 'FLOOR_SPECIALIST',
    'LUXURY_SURFACES', 'EQUIPMENT_HANDLING', 'TEAM_MANAGEMENT',
    'QUALITY_CONTROL', 'DETAIL_FINISHING'
  ])).default([]),
  experience: z.enum(['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']).default('JUNIOR'),
  availability: z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION']).default('AVAILABLE'),
  hourlyRate: z.number().min(0, 'Taux horaire doit être positif').max(1000, 'Taux horaire trop élevé').optional(),
  isActive: z.boolean().default(true),
  joinedAt: z.date().default(() => new Date())
});

// Task Schemas
export const taskValidationSchema = z.object({
  title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
  description: z.string().max(1000, 'Description trop longue').optional().transform(val => val === '' ? null : val),
  category: z.enum(['GENERAL', 'CLEANING', 'MAINTENANCE', 'INSPECTION', 'SETUP']),
  type: z.enum(['EXECUTION', 'QUALITY_CHECK', 'DOCUMENTATION', 'CLIENT_INTERACTION']),
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'REJECTED']).default('ASSIGNED'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  estimatedDuration: z.number().min(0.1, 'Durée minimale: 0.1 heure').max(24, 'Durée maximale: 24 heures'),
  actualDuration: z.number().min(0).optional(),
  assignedToId: z.string().optional(),
  dueDate: z.date().optional(),
  completedAt: z.date().optional(),
  validatedAt: z.date().optional(),
  notes: z.string().max(1000, 'Notes trop longues').optional().transform(val => val === '' ? null : val),
  attachments: z.array(z.string().url()).default([]),
  missionId: z.string().min(1, 'Mission ID requis')
});

// Inventory Schemas
export const inventoryValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  category: z.enum(['CLEANING_PRODUCTS', 'EQUIPMENT', 'CONSUMABLES', 'PROTECTIVE_GEAR', 'TOOLS', 'SPARE_PARTS']),
  unit: z.string().min(1, 'Unité requise').max(20, 'Unité trop longue'),
  currentStock: z.number().min(0, 'Stock actuel doit être positif'),
  minimumStock: z.number().min(0, 'Stock minimum doit être positif'),
  unitPrice: z.number().min(0, 'Prix unitaire doit être positif'),
  supplier: z.string().min(1, 'Fournisseur requis').max(100, 'Fournisseur trop long'),
  description: z.string().max(500, 'Description trop longue').optional().transform(val => val === '' ? null : val),
  sku: z.string().max(50, 'SKU trop long').optional().transform(val => val === '' ? null : val),
  barcode: z.string().max(50, 'Code-barres trop long').optional().transform(val => val === '' ? null : val),
  expiryDate: z.date().optional(),
  location: z.string().max(100, 'Emplacement trop long').optional().transform(val => val === '' ? null : val),
  isActive: z.boolean().default(true)
});

export const inventoryUsageValidationSchema = z.object({
  quantity: z.number().min(0.01, 'Quantité minimale: 0.01'),
  notes: z.string().max(500, 'Notes trop longues').optional().transform(val => val === '' ? null : val),
  inventoryId: z.string().min(1, 'Inventory ID requis'),
  missionId: z.string().min(1, 'Mission ID requis'),
  usedAt: z.date().default(() => new Date())
});

// Expense Schemas
export const expenseValidationSchema = z.object({
  date: z.date(),
  amount: z.number().min(0.01, 'Montant minimum: 0.01'),
  category: z.enum([
    'OPERATIONS', 'REVENTE_NEGOCE', 'RESSOURCES_HUMAINES', 'ADMINISTRATIF_FINANCIER',
    'MARKETING_COMMERCIAL', 'LOGISTIQUE_MOBILITE', 'INFRASTRUCTURES_LOCAUX',
    'LOCATIONS', 'EXCEPTIONNELLES_DIVERSES'
  ]),
  subCategory: z.string().min(1, 'Sous-catégorie requise').max(100, 'Sous-catégorie trop longue'),
  paymentMethod: z.enum(['CASH', 'VIREMENT', 'CARTE', 'CHEQUE', 'MOBILE', 'AUTRE']),
  vendor: z.string().max(100, 'Fournisseur trop long').optional().transform(val => val === '' ? null : val),
  description: z.string().max(500, 'Description trop longue').optional().transform(val => val === '' ? null : val),
  proofUrl: z.string().url('URL de justificatif invalide').optional(),
  rentalStartDate: z.date().optional(),
  rentalEndDate: z.date().optional(),
  missionId: z.string().optional(),
  leadId: z.string().optional(),
  userId: z.string().min(1, 'User ID requis')
});

// Invoice Schemas
export const invoiceValidationSchema = z.object({
  invoiceNumber: z.string().min(1, 'Numéro de facture requis').max(50, 'Numéro de facture trop long'),
  amount: z.number().min(0.01, 'Montant minimum: 0.01'),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),
  issueDate: z.date().default(() => new Date()),
  dueDate: z.date(),
  missionId: z.string().min(1, 'Mission ID requis'),
  leadId: z.string().min(1, 'Lead ID requis'),
  description: z.string().max(1000, 'Description trop longue').optional().transform(val => val === '' ? null : val),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description requise'),
    quantity: z.number().min(0.1, 'Quantité minimale: 0.1'),
    unitPrice: z.number().min(0, 'Prix unitaire doit être positif'),
    totalPrice: z.number().min(0, 'Prix total doit être positif')
  })).optional(),
  subTotal: z.number().min(0, 'Sous-total doit être positif').optional(),
  taxAmount: z.number().min(0, 'Montant de taxe doit être positif').optional(),
  totalAmount: z.number().min(0, 'Montant total doit être positif').optional()
});

// Activity & Communication Schemas
export const activityValidationSchema = z.object({
  type: z.enum(['LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_QUALIFIED', 'MISSION_CREATED', 'MISSION_COMPLETED', 'QUOTE_SENT', 'PAYMENT_RECEIVED']),
  title: z.string().min(1, 'Titre requis').max(200, 'Titre trop long'),
  description: z.string().min(1, 'Description requise').max(1000, 'Description trop longue'),
  metadata: z.any().optional(),
  userId: z.string().min(1, 'User ID requis'),
  leadId: z.string().optional()
});

export const conversationValidationSchema = z.object({
  missionId: z.string().min(1, 'Mission ID requis'),
  isActive: z.boolean().default(true)
});

export const messageValidationSchema = z.object({
  content: z.string().min(1, 'Contenu requis').max(2000, 'Message trop long'),
  conversationId: z.string().min(1, 'Conversation ID requis'),
  senderId: z.string().min(1, 'Sender ID requis'),
  isRead: z.boolean().default(false),
  attachments: z.array(z.string().url()).default([])
});

// Quality Check Schemas
export const qualityCheckValidationSchema = z.object({
  missionId: z.string().min(1, 'Mission ID requis'),
  type: z.enum(['PRE_SERVICE', 'IN_PROGRESS', 'POST_SERVICE', 'CLIENT_FEEDBACK', 'INTERNAL_AUDIT']),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'REQUIRES_REWORK']).default('PENDING'),
  checkedBy: z.string().optional(),
  checkedAt: z.date().optional(),
  notes: z.string().max(1000, 'Notes trop longues').optional().transform(val => val === '' ? null : val),
  photos: z.array(z.string().url()).default([]),
  issues: z.any().optional(),
  validatedAt: z.date().optional(),
  score: z.number().min(1, 'Score minimum: 1').max(5, 'Score maximum: 5').optional(),
  recommendations: z.string().max(1000, 'Recommandations trop longues').optional().transform(val => val === '' ? null : val)
});

// Task Template Schemas
export const taskTemplateValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  description: z.string().max(500, 'Description trop longue').optional().transform(val => val === '' ? null : val),
  tasks: z.any(), // JSON field containing task definitions
  category: z.enum(['GENERAL', 'CLEANING', 'MAINTENANCE', 'INSPECTION', 'SETUP']),
  isActive: z.boolean().default(true),
  estimatedDuration: z.number().min(0.1, 'Durée minimale: 0.1 heure').optional(),
  requiredSpecialties: z.array(z.string()).default([]),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'EXPERT']).default('MEDIUM')
});

// System Log Schemas
export const systemLogValidationSchema = z.object({
  type: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL', 'DEBUG']),
  status: z.enum(['SUCCESS', 'FAILURE', 'PENDING', 'CANCELLED']),
  message: z.string().min(1, 'Message requis').max(1000, 'Message trop long'),
  metadata: z.any().optional(),
  userId: z.string().optional(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  endpoint: z.string().optional(),
  duration: z.number().min(0).optional()
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

// =============================================================================
// ADDITIONAL VALIDATION FUNCTIONS - ADD THESE
// =============================================================================

export function validateCompleteUserInput(data: any, isCreation = true) {
  if (isCreation) {
    return userValidationSchema.safeParse(data);
  } else {
    return userValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteTeamInput(data: any, isCreation = true) {
  if (isCreation) {
    return teamValidationSchema.safeParse(data);
  } else {
    return teamValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteTaskInput(data: any, isCreation = true) {
  if (isCreation) {
    return taskValidationSchema.safeParse(data);
  } else {
    return taskValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteInventoryInput(data: any, isCreation = true) {
  if (isCreation) {
    return inventoryValidationSchema.safeParse(data);
  } else {
    return inventoryValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteExpenseInput(data: any, isCreation = true) {
  if (isCreation) {
    return expenseValidationSchema.safeParse(data);
  } else {
    return expenseValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteInvoiceInput(data: any, isCreation = true) {
  if (isCreation) {
    return invoiceValidationSchema.safeParse(data);
  } else {
    return invoiceValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteActivityInput(data: any) {
  return activityValidationSchema.safeParse(data);
}

export function validateCompleteQualityCheckInput(data: any, isCreation = true) {
  if (isCreation) {
    return qualityCheckValidationSchema.safeParse(data);
  } else {
    return qualityCheckValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteTaskTemplateInput(data: any, isCreation = true) {
  if (isCreation) {
    return taskTemplateValidationSchema.safeParse(data);
  } else {
    return taskTemplateValidationSchema.partial().safeParse(data);
  }
}

export function validateCompleteSystemLogInput(data: any) {
  return systemLogValidationSchema.safeParse(data);
}

export function validateCompleteConversationInput(data: any) {
  return conversationValidationSchema.safeParse(data);
}

export function validateCompleteMessageInput(data: any) {
  return messageValidationSchema.safeParse(data);
}

export function validateCompleteInventoryUsageInput(data: any) {
  return inventoryUsageValidationSchema.safeParse(data);
}

export function validateCompleteAccountInput(data: any) {
  return accountValidationSchema.safeParse(data);
}

export function validateCompleteSessionInput(data: any) {
  return sessionValidationSchema.safeParse(data);
}

// =============================================================================
// ADDITIONAL CLEANING FUNCTIONS - ADD THESE
// =============================================================================

export function cleanInventoryData(data: any): any {
  const cleaned = { ...data };

  ['currentStock', 'minimumStock', 'unitPrice'].forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? 0 : num;
    }
  });

  if (cleaned.expiryDate && typeof cleaned.expiryDate === 'string') {
    cleaned.expiryDate = new Date(cleaned.expiryDate);
  }

  if (typeof cleaned.isActive === 'string') {
    cleaned.isActive = cleaned.isActive.toLowerCase() === 'true';
  }

  return cleaned;
}

export function cleanExpenseData(data: any): any {
  const cleaned = { ...data };

  if (cleaned.amount) {
    const amount = parseFloat(cleaned.amount);
    cleaned.amount = isNaN(amount) ? 0 : amount;
  }

  ['date', 'rentalStartDate', 'rentalEndDate'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  const optionalFields = ['vendor', 'description', 'proofUrl', 'missionId', 'leadId'];
  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null;
    }
  });

  return cleaned;
}

export function cleanInvoiceData(data: any): any {
  const cleaned = { ...data };

  ['amount', 'subTotal', 'taxAmount', 'totalAmount'].forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? 0 : num;
    }
  });

  ['issueDate', 'dueDate'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  return cleaned;
}

export function cleanTaskData(data: any): any {
  const cleaned = { ...data };

  ['estimatedDuration', 'actualDuration'].forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? null : num;
    }
  });

  ['dueDate', 'completedAt', 'validatedAt'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  if (cleaned.attachments && !Array.isArray(cleaned.attachments)) {
    cleaned.attachments = [];
  }

  return cleaned;
}

// Type exports for convenience
export type CreateMissionInput = CompleteMissionInput;
export type CreateQuoteInput = CompleteQuoteInput;
export type CreateLeadInput = CompleteLeadInput;
export type CreateTeamMemberInput = CompleteTeamMemberInput;
export type CreateFieldReportInput = CompleteFieldReportInput;
export type CreateSubscriptionInput = CompleteSubscriptionInput;
// =============================================================================
// ADDITIONAL TYPE EXPORTS - ADD THESE
// =============================================================================

export type CompleteUserInput = z.infer<typeof userValidationSchema>;
export type CompleteTeamInput = z.infer<typeof teamValidationSchema>;
export type CompleteTaskInput = z.infer<typeof taskValidationSchema>;
export type CompleteInventoryInput = z.infer<typeof inventoryValidationSchema>;
export type CompleteInventoryUsageInput = z.infer<typeof inventoryUsageValidationSchema>;
export type CompleteExpenseInput = z.infer<typeof expenseValidationSchema>;
export type CompleteInvoiceInput = z.infer<typeof invoiceValidationSchema>;
export type CompleteActivityInput = z.infer<typeof activityValidationSchema>;
export type CompleteConversationInput = z.infer<typeof conversationValidationSchema>;
export type CompleteMessageInput = z.infer<typeof messageValidationSchema>;
export type CompleteQualityCheckInput = z.infer<typeof qualityCheckValidationSchema>;
export type CompleteTaskTemplateInput = z.infer<typeof taskTemplateValidationSchema>;
export type CompleteSystemLogInput = z.infer<typeof systemLogValidationSchema>;
export type CompleteAccountInput = z.infer<typeof accountValidationSchema>;
export type CompleteSessionInput = z.infer<typeof sessionValidationSchema>;

// Convenience exports
export type CreateUserInput = CompleteUserInput;
export type CreateTeamInput = CompleteTeamInput;
export type CreateTaskInput = CompleteTaskInput;
export type CreateInventoryInput = CompleteInventoryInput;
export type CreateExpenseInput = CompleteExpenseInput;
export type CreateInvoiceInput = CompleteInvoiceInput;
export type CreateActivityInput = CompleteActivityInput;
export type CreateQualityCheckInput = CompleteQualityCheckInput;
export type CreateTaskTemplateInput = CompleteTaskTemplateInput;