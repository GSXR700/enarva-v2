// lib/validations/quote-validation.ts - FOCUSED QUOTE VALIDATION
import { z } from 'zod';

// =============================================================================
// QUOTE VALIDATION SCHEMAS
// =============================================================================

const lineItemSchema = z.object({
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
});

const serviceSchema = z.object({
  type: z.string().min(1, 'Type de service requis'),
  surface: z.number().min(1, 'Surface requise'),
  levels: z.number().min(1, 'Nombre d\'étages requis'),
  distance: z.number().min(0, 'Distance doit être positive'),
  etage: z.string().min(1, 'Étage requis'),
  delai: z.enum(['STANDARD', 'EXPRESS', 'URGENT']),
  difficulte: z.enum(['STANDARD', 'COMPLEX', 'HIGH_DIFFICULTY'])
});

const leadUpdatesSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
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
});

export const completeQuoteValidationSchema = z.object({
  quoteNumber: z.string()
    .min(1, 'Numéro de devis requis')
    .max(50, 'Numéro de devis trop long')
    .optional(),

  // Client selection - either existing lead or new client info
  leadId: z.string().min(1, 'Lead ID requis').optional(),
  newClientName: z.string().min(1, 'Nom du nouveau client requis').optional(),
  newClientEmail: z.string().email('Email invalide').optional().nullable(),
  newClientPhone: z.string()
    .min(10, 'Numéro de téléphone invalide')
    .max(20, 'Numéro de téléphone trop long')
    .optional(),
  newClientAddress: z.string().max(200, 'Adresse trop longue').optional().nullable(),

  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED'])
    .default('DRAFT'),

  businessType: z.enum(['SERVICE', 'PRODUCT']).default('SERVICE'),

  lineItems: z.array(lineItemSchema).min(1, 'Au moins un article requis'),

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
  levels: z.number().min(1).optional(),
  propertyType: z.string().optional(),
  
  // Service-specific fields
  services: z.array(serviceSchema).optional(),

  // Product-specific fields
  productCategory: z.enum([
    'CLEANING_PRODUCTS', 'EQUIPMENT', 'CONSUMABLES', 'PROTECTIVE_GEAR'
  ]).optional(),

  productDetails: z.string()
    .max(1000, 'Détails produit trop longs')
    .optional(),

  deliveryType: z.enum(['PICKUP', 'DELIVERY', 'INSTALLATION']).optional(),
  deliveryAddress: z.string().max(200, 'Adresse de livraison trop longue').optional(),
  deliveryNotes: z.string().max(500, 'Notes de livraison trop longues').optional(),

  leadUpdates: leadUpdatesSchema.optional(),
  validatedAt: z.date().optional()

}).refine((data) => {
  return data.leadId || data.newClientName;
}, {
  message: "Un lead existant doit être sélectionné ou les informations d'un nouveau client doivent être fournies",
  path: ["leadId"]
}).refine((data) => {
  if (data.newClientName && !data.newClientPhone) {
    return false;
  }
  return true;
}, {
  message: "Le numéro de téléphone est requis pour un nouveau client",
  path: ["newClientPhone"]
}).refine((data) => {
  if (data.businessType === 'SERVICE') {
    return data.lineItems && data.lineItems.length > 0
  }
  return true
}, {
  message: "Au moins un élément de service est requis pour un devis de service",
  path: ["lineItems"]
}).refine((data) => {
  if (data.businessType === 'PRODUCT') {
    return data.productCategory && data.lineItems && data.lineItems.length > 0
  }
  return true
}, {
  message: "La catégorie produit et les articles sont requis pour un devis de produit",
  path: ["productCategory"]
}).refine((data) => {
  if(data.lineItems && data.lineItems.length > 0) {
    const calculatedSubTotal = data.lineItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const tolerance = 0.01
    return Math.abs(calculatedSubTotal - data.subTotalHT) <= tolerance
  }
  return true;
}, {
  message: "Le sous-total ne correspond pas à la somme des articles",
  path: ["subTotalHT"]
}).refine((data) => {
  const tolerance = 0.01
  return Math.abs((data.subTotalHT + data.vatAmount) - data.totalTTC) <= tolerance
}, {
  message: "Le total TTC ne correspond pas au sous-total plus la TVA",
  path: ["totalTTC"]
});

// Simplified quote update schema
export const quoteUpdateValidationSchema = z.object({
  lineItems: z.array(z.any()).optional(),
  subTotalHT: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  vatAmount: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  totalTTC: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  finalPrice: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED']).optional(),
  type: z.enum(['STANDARD', 'EXPRESS', 'PREMIUM', 'CUSTOM']).optional(),
  surface: z.number().optional().nullable(),
  levels: z.number().optional().nullable(),
  propertyType: z.string().optional().nullable(),
  productCategory: z.string().optional().nullable(),
  productDetails: z.any().optional().nullable(),
  deliveryType: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
  expiresAt: z.union([
    z.string().datetime(),
    z.string().transform(val => new Date(val)),
    z.date(),
    z.null()
  ]).optional(),
  leadUpdates: leadUpdatesSchema.optional()
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanQuoteData(data: any): any {
  const cleaned = { ...data }

  const numericFields = ['subTotalHT', 'vatAmount', 'totalTTC', 'finalPrice', 'surface']
  
  numericFields.forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field])
      cleaned[field] = isNaN(num) ? 0 : num
    }
  })

  if (cleaned.lineItems && Array.isArray(cleaned.lineItems)) {
    cleaned.lineItems = cleaned.lineItems.map((item: any) => ({
      ...item,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      totalPrice: parseFloat(item.totalPrice) || 0,
      amount: parseFloat(item.amount) || parseFloat(item.totalPrice) || 0
    }));
  }

  const optionalFields = ['productDetails', 'deliveryAddress', 'deliveryNotes']
  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null
    }
  })

  return cleaned
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteQuoteInput(data: any) {
  return completeQuoteValidationSchema.safeParse(cleanQuoteData(data));
}

export function validateQuoteUpdate(data: any) {
  return quoteUpdateValidationSchema.safeParse(cleanQuoteData(data));
}

export function validateQuoteCreation(data: any) {
  return completeQuoteValidationSchema.safeParse(cleanQuoteData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteQuoteInput = z.infer<typeof completeQuoteValidationSchema>;
export type QuoteUpdateInput = z.infer<typeof quoteUpdateValidationSchema>;
export type CreateQuoteInput = CompleteQuoteInput;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type ServiceInput = z.infer<typeof serviceSchema>;