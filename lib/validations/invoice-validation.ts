// lib/validations/invoice-validation.ts - FOCUSED INVOICE VALIDATION
import { z } from 'zod';

// =============================================================================
// INVOICE VALIDATION SCHEMAS
// =============================================================================

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description requise'),
  quantity: z.number().min(0.1, 'Quantité minimale: 0.1'),
  unitPrice: z.number().min(0, 'Prix unitaire doit être positif'),
  totalPrice: z.number().min(0, 'Prix total doit être positif')
});

// FIXED: Create base schema without .refine() for .partial() to work  
const baseInvoiceSchema = z.object({
  invoiceNumber: z.string()
    .min(1, 'Numéro de facture requis')
    .max(50, 'Numéro de facture trop long'),

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

  status: z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).default('DRAFT'),

  issueDate: z.union([
    z.date(),
    z.string().transform(val => new Date(val))
  ]).default(() => new Date()),

  dueDate: z.union([
    z.date(),
    z.string().transform(val => new Date(val))
  ]),

  missionId: z.string().min(1, 'Mission ID requis'),
  leadId: z.string().min(1, 'Lead ID requis'),

  description: z.string()
    .max(1000, 'Description trop longue')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  lineItems: z.array(lineItemSchema).optional(),

  subTotal: z.union([
    z.number().min(0, 'Sous-total doit être positif'),
    z.string().transform(val => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    })
  ]).optional(),

  taxAmount: z.union([
    z.number().min(0, 'Montant de taxe doit être positif'),
    z.string().transform(val => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    })
  ]).optional(),

  totalAmount: z.union([
    z.number().min(0, 'Montant total doit être positif'),
    z.string().transform(val => {
      const num = parseFloat(val);
      return isNaN(num) ? 0 : num;
    })
  ]).optional()
});

// Apply refinements for full validation
export const invoiceValidationSchema = baseInvoiceSchema.refine((data) => {
  const issueDate = new Date(data.issueDate);
  const dueDate = new Date(data.dueDate);
  return dueDate > issueDate;
}, {
  message: "La date d'échéance doit être après la date d'émission",
  path: ["dueDate"]
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanInvoiceData(data: any): any {
  const cleaned = { ...data };

  // Convert numeric fields
  ['amount', 'subTotal', 'taxAmount', 'totalAmount'].forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? 0 : num;
    }
  });

  // Handle date fields
  ['issueDate', 'dueDate'].forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = new Date(cleaned[field]);
    }
  });

  // Handle line items
  if (cleaned.lineItems && Array.isArray(cleaned.lineItems)) {
    cleaned.lineItems = cleaned.lineItems.map((item: any) => ({
      ...item,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice) || 0,
      totalPrice: parseFloat(item.totalPrice) || 0
    }));
  }

  return cleaned;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteInvoiceInput(data: any, isCreation = true) {
  if (isCreation) {
    return invoiceValidationSchema.safeParse(cleanInvoiceData(data));
  } else {
    // FIXED: Use base schema for partial validation
    return baseInvoiceSchema.partial().safeParse(cleanInvoiceData(data));
  }
}

export function validateInvoiceCreation(data: any) {
  return invoiceValidationSchema.safeParse(cleanInvoiceData(data));
}

export function validateInvoiceUpdate(data: any) {
  // FIXED: Use base schema for updates
  return baseInvoiceSchema.partial().safeParse(cleanInvoiceData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteInvoiceInput = z.infer<typeof invoiceValidationSchema>;
export type CreateInvoiceInput = CompleteInvoiceInput;
export type InvoiceLineItem = z.infer<typeof lineItemSchema>;