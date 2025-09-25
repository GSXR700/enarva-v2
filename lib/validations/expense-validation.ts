// lib/validations/expense-validation.ts - FOCUSED EXPENSE VALIDATION
import { z } from 'zod';

// =============================================================================
// EXPENSE VALIDATION SCHEMAS
// =============================================================================

// FIXED: Create base schema without .refine() for .partial() to work
const baseExpenseSchema = z.object({
  date: z.union([
    z.date(),
    z.string().transform(val => new Date(val))
  ]).refine(date => !isNaN(new Date(date).getTime()), {
    message: "Date invalide"
  }),
  
  amount: z.union([
    z.number().min(0.01, 'Montant minimum: 0.01'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0.01) {
        throw new Error('Montant invalide');
      }
      return num;
    })
  ]),

  category: z.enum([
    'OPERATIONS', 'REVENTE_NEGOCE', 'RESSOURCES_HUMAINES', 'ADMINISTRATIF_FINANCIER',
    'MARKETING_COMMERCIAL', 'LOGISTIQUE_MOBILITE', 'INFRASTRUCTURES_LOCAUX',
    'LOCATIONS', 'EXCEPTIONNELLES_DIVERSES'
  ]),

  subCategory: z.string().min(1, 'Sous-catégorie requise').max(100, 'Sous-catégorie trop longue'),
  
  paymentMethod: z.enum(['CASH', 'VIREMENT', 'CARTE', 'CHEQUE', 'MOBILE', 'AUTRE']),
  
  vendor: z.string()
    .max(100, 'Fournisseur trop long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  description: z.string()
    .max(500, 'Description trop longue')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  proofUrl: z.string()
    .url('URL de justificatif invalide')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  rentalStartDate: z.union([
    z.date(),
    z.string().transform(val => val ? new Date(val) : null)
  ]).optional().nullable(),

  rentalEndDate: z.union([
    z.date(),
    z.string().transform(val => val ? new Date(val) : null)
  ]).optional().nullable(),

  missionId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  leadId: z.string().optional().nullable().transform(val => val === '' ? null : val),
  userId: z.string().min(1, 'User ID requis')
});

// Apply refinements for full validation
export const expenseValidationSchema = baseExpenseSchema.refine((data) => {
  if (data.rentalStartDate && data.rentalEndDate) {
    return new Date(data.rentalEndDate) > new Date(data.rentalStartDate);
  }
  return true;
}, {
  message: "La date de fin de location doit être après la date de début",
  path: ["rentalEndDate"]
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanExpenseData(data: any): any {
  const cleaned = { ...data };

  // Convert amount to number
  if (cleaned.amount) {
    const amount = parseFloat(cleaned.amount);
    cleaned.amount = isNaN(amount) ? 0 : amount;
  }

  // Handle date fields
  ['date', 'rentalStartDate', 'rentalEndDate'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  // Convert empty strings to null for optional fields
  const optionalFields = ['vendor', 'description', 'proofUrl', 'missionId', 'leadId'];
  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null;
    }
  });

  return cleaned;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteExpenseInput(data: any, isCreation = true) {
  if (isCreation) {
    return expenseValidationSchema.safeParse(cleanExpenseData(data));
  } else {
    // FIXED: Use base schema for partial validation
    return baseExpenseSchema.partial().safeParse(cleanExpenseData(data));
  }
}

export function validateExpenseCreation(data: any) {
  return expenseValidationSchema.safeParse(cleanExpenseData(data));
}

export function validateExpenseUpdate(data: any) {
  // FIXED: Use base schema for updates
  return baseExpenseSchema.partial().safeParse(cleanExpenseData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteExpenseInput = z.infer<typeof expenseValidationSchema>;
export type CreateExpenseInput = CompleteExpenseInput;