// lib/validations/system-validation.ts - FOCUSED SYSTEM & ACTIVITY VALIDATION
import { z } from 'zod';

// =============================================================================
// ACTIVITY & COMMUNICATION VALIDATION SCHEMAS
// =============================================================================

export const activityValidationSchema = z.object({
  type: z.enum([
    'LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_QUALIFIED', 'MISSION_CREATED', 
    'MISSION_UPDATED', 'MISSION_COMPLETED', 'MISSION_DELETED', 'QUOTE_SENT', 
    'QUOTE_ACCEPTED', 'PAYMENT_RECEIVED', 'SYSTEM_MAINTENANCE'
  ]),
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

// =============================================================================
// FIELD REPORT VALIDATION SCHEMA
// =============================================================================

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

  hoursWorked: z.union([
    z.number().min(0.1, 'Minimum 0.1 heure').max(24, 'Maximum 24 heures'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0.1 || num > 24) {
        throw new Error('Heures travaillées invalides');
      }
      return num;
    })
  ]),

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
    .transform(val => val === '' ? null : val),

  submittedById: z.string().min(1, 'ID du soumissionnaire requis'),
  submissionDate: z.date().default(() => new Date())
}).refine((data) => {
  // Custom validation: at least one photo should be provided
  if (data.beforePhotos.length === 0 && data.afterPhotos.length === 0) {
    return false
  }
  return true
}, {
  message: "Au moins une photo (avant ou après) est requise",
  path: ["beforePhotos"]
});

// =============================================================================
// SUBSCRIPTION VALIDATION SCHEMA
// =============================================================================

export const completeSubscriptionValidationSchema = z.object({
  leadId: z.string()
    .min(1, 'Lead ID requis'),

  type: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'CUSTOM']),

  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'])
    .default('ACTIVE'),

  monthlyPrice: z.union([
    z.number().min(0.01, 'Prix mensuel minimum: 0.01MAD').max(10000, 'Prix mensuel maximum: 10000MAD'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0.01 || num > 10000) {
        throw new Error('Prix mensuel invalide');
      }
      return num;
    })
  ]),

  discount: z.union([
    z.number().min(0, 'Remise minimum: 0%').max(100, 'Remise maximum: 100%').default(0),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 100) {
        return 0;
      }
      return num;
    })
  ]),

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

  includedServices: z.union([
    z.number().min(1, 'Nombre de services minimum: 1').max(100, 'Nombre de services maximum: 100'),
    z.string().transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 1 || num > 100) {
        throw new Error('Nombre de services invalide');
      }
      return num;
    })
  ]),

  usedServices: z.union([
    z.number().min(0, 'Services utilisés minimum: 0').default(0),
    z.string().transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) {
        return 0;
      }
      return num;
    })
  ])
}).refine((data) => {
  // Custom validation: used services cannot exceed included services
  return data.usedServices <= data.includedServices
}, {
  message: "Les services utilisés ne peuvent pas dépasser les services inclus",
  path: ["usedServices"]
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanFieldReportData(data: any): any {
  const cleaned = { ...data };

  // Handle numeric fields
  if (cleaned.hoursWorked) {
    const hours = parseFloat(cleaned.hoursWorked);
    cleaned.hoursWorked = isNaN(hours) ? 0 : hours;
  }

  // Handle arrays
  if (!Array.isArray(cleaned.beforePhotos)) {
    cleaned.beforePhotos = [];
  }
  if (!Array.isArray(cleaned.afterPhotos)) {
    cleaned.afterPhotos = [];
  }

  // Convert empty strings to null
  const optionalFields = ['generalObservations', 'clientFeedback', 'issuesEncountered', 'additionalNotes'];
  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null;
    }
  });

  return cleaned;
}

export function cleanSubscriptionData(data: any): any {
  const cleaned = { ...data };

  // Handle numeric fields
  ['monthlyPrice', 'discount'].forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? 0 : num;
    }
  });

  ['includedServices', 'usedServices'].forEach(field => {
    if (cleaned[field]) {
      const num = parseInt(cleaned[field]);
      cleaned[field] = isNaN(num) ? 0 : num;
    }
  });

  return cleaned;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteActivityInput(data: any) {
  return activityValidationSchema.safeParse(data);
}

export function validateCompleteConversationInput(data: any) {
  return conversationValidationSchema.safeParse(data);
}

export function validateCompleteMessageInput(data: any) {
  return messageValidationSchema.safeParse(data);
}

export function validateCompleteSystemLogInput(data: any) {
  return systemLogValidationSchema.safeParse(data);
}

export function validateCompleteFieldReportInput(data: any) {
  return completeFieldReportValidationSchema.safeParse(cleanFieldReportData(data));
}

export function validateCompleteSubscriptionInput(data: any) {
  return completeSubscriptionValidationSchema.safeParse(cleanSubscriptionData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteActivityInput = z.infer<typeof activityValidationSchema>;
export type CompleteConversationInput = z.infer<typeof conversationValidationSchema>;
export type CompleteMessageInput = z.infer<typeof messageValidationSchema>;
export type CompleteSystemLogInput = z.infer<typeof systemLogValidationSchema>;
export type CompleteFieldReportInput = z.infer<typeof completeFieldReportValidationSchema>;
export type CompleteSubscriptionInput = z.infer<typeof completeSubscriptionValidationSchema>;
export type CreateFieldReportInput = CompleteFieldReportInput;
export type CreateSubscriptionInput = CompleteSubscriptionInput;
export type CreateActivityInput = CompleteActivityInput;