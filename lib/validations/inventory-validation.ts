// lib/validations/inventory-validation.ts - FOCUSED INVENTORY VALIDATION
import { z } from 'zod';

// =============================================================================
// INVENTORY VALIDATION SCHEMAS
// =============================================================================

export const inventoryValidationSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  
  category: z.enum([
    'CLEANING_PRODUCTS', 'EQUIPMENT', 'CONSUMABLES', 
    'PROTECTIVE_GEAR', 'TOOLS', 'SPARE_PARTS'
  ]),

  unit: z.string().min(1, 'Unité requise').max(20, 'Unité trop longue'),

  currentStock: z.union([
    z.number().min(0, 'Stock actuel doit être positif'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        throw new Error('Stock invalide');
      }
      return num;
    })
  ]),

  minimumStock: z.union([
    z.number().min(0, 'Stock minimum doit être positif'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        throw new Error('Stock minimum invalide');
      }
      return num;
    })
  ]),

  unitPrice: z.union([
    z.number().min(0, 'Prix unitaire doit être positif'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        throw new Error('Prix unitaire invalide');
      }
      return num;
    })
  ]),

  supplier: z.string().min(1, 'Fournisseur requis').max(100, 'Fournisseur trop long'),

  description: z.string()
    .max(500, 'Description trop longue')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  sku: z.string()
    .max(50, 'SKU trop long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  barcode: z.string()
    .max(50, 'Code-barres trop long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  expiryDate: z.union([
    z.date(),
    z.string().transform(val => val ? new Date(val) : null)
  ]).optional().nullable(),

  location: z.string()
    .max(100, 'Emplacement trop long')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  isActive: z.boolean().default(true)
});

export const inventoryUsageValidationSchema = z.object({
  quantity: z.union([
    z.number().min(0.01, 'Quantité minimale: 0.01'),
    z.string().transform(val => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0.01) {
        throw new Error('Quantité invalide');
      }
      return num;
    })
  ]),

  notes: z.string()
    .max(500, 'Notes trop longues')
    .optional()
    .nullable()
    .transform(val => val === '' ? null : val),

  inventoryId: z.string().min(1, 'Inventory ID requis'),
  missionId: z.string().min(1, 'Mission ID requis'),
  
  usedAt: z.union([
    z.date(),
    z.string().transform(val => new Date(val))
  ]).default(() => new Date())
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

export function cleanInventoryData(data: any): any {
  const cleaned = { ...data };

  // Convert numeric fields
  ['currentStock', 'minimumStock', 'unitPrice'].forEach(field => {
    if (cleaned[field]) {
      const num = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(num) ? 0 : num;
    }
  });

  // Handle date fields
  if (cleaned.expiryDate && typeof cleaned.expiryDate === 'string') {
    cleaned.expiryDate = new Date(cleaned.expiryDate);
  }

  // Handle boolean fields
  if (typeof cleaned.isActive === 'string') {
    cleaned.isActive = cleaned.isActive.toLowerCase() === 'true';
  }

  // Convert empty strings to null for optional fields
  const optionalFields = ['description', 'sku', 'barcode', 'location'];
  optionalFields.forEach(field => {
    if (cleaned[field] === '') {
      cleaned[field] = null;
    }
  });

  return cleaned;
}

export function cleanInventoryUsageData(data: any): any {
  const cleaned = { ...data };

  // Convert quantity to number
  if (cleaned.quantity) {
    const num = parseFloat(cleaned.quantity);
    cleaned.quantity = isNaN(num) ? 0 : num;
  }

  // Handle date field
  if (cleaned.usedAt && typeof cleaned.usedAt === 'string') {
    cleaned.usedAt = new Date(cleaned.usedAt);
  }

  // Convert empty strings to null
  if (cleaned.notes === '') {
    cleaned.notes = null;
  }

  return cleaned;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

export function validateCompleteInventoryInput(data: any, isCreation = true) {
  if (isCreation) {
    return inventoryValidationSchema.safeParse(cleanInventoryData(data));
  } else {
    return inventoryValidationSchema.partial().safeParse(cleanInventoryData(data));
  }
}

export function validateInventoryCreation(data: any) {
  return inventoryValidationSchema.safeParse(cleanInventoryData(data));
}

export function validateInventoryUpdate(data: any) {
  return inventoryValidationSchema.partial().safeParse(cleanInventoryData(data));
}

export function validateCompleteInventoryUsageInput(data: any) {
  return inventoryUsageValidationSchema.safeParse(cleanInventoryUsageData(data));
}

export function validateInventoryUsageCreation(data: any) {
  return inventoryUsageValidationSchema.safeParse(cleanInventoryUsageData(data));
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type CompleteInventoryInput = z.infer<typeof inventoryValidationSchema>;
export type CompleteInventoryUsageInput = z.infer<typeof inventoryUsageValidationSchema>;
export type CreateInventoryInput = CompleteInventoryInput;
export type CreateInventoryUsageInput = CompleteInventoryUsageInput;