// lib/index.ts - CORRECTED EXPORTS
// This file provides a single import point for all validation modules

import { z } from 'zod'; // Keep zod import if used in helper functions below

// =============================================================================
// PDF Generators
// =============================================================================
export { generateInvoicePDF } from './invoice-pdf-generator';
export { generateQuotePDF, prepareQuotePDFData } from './pdf-generator';
export type { QuotePDFData } from './pdf-generator';

// =============================================================================
// PDF Utilities
// =============================================================================
export {
  BLUE_PRIMARY,
  TEXT_DARK,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
  setColor,
  setFillColor, // Export setFillColor as well
  formatCurrency,
  numberToFrenchWords,
  generateObjectTitle,
  loadPDFContent,
  normalizeServiceType // Export normalizeServiceType if needed elsewhere
} from './pdf-utils';

// =============================================================================
// PDF Templates
// =============================================================================
export {
  PDF_TEMPLATES,
  SERVICE_DEFAULTS, // Corrected export name
  PAYMENT_CONDITIONS,
  DELIVERY_TIMEFRAMES,
  PROPERTY_TYPE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  getTemplate,
  getServiceDefaults, // Corrected export name
  getPaymentConditions,
  getPropertyTypeLabel,
  getProductCategoryLabel,
  getDeliveryTimeframe
} from './pdf-templates';
export type {
  TemplateType,
  PDFTemplate,
  ServiceDefaults, // Corrected export name
  PaymentConditionTemplate
} from './pdf-templates';

// =============================================================================
// PDF Material Products
// =============================================================================
export {
  MATERIAL_PRODUCTS,
  getProductsForMaterials,
  mapLeadMaterialsToProductKeys
} from './pdf-material-products';
export type { MaterialProduct } from './pdf-material-products';

// =============================================================================
// PDF Assets & Fonts
// =============================================================================
export { PDF_IMAGES } from './pdf-assets';
export { poppinsNormal, poppinsBold } from './fonts';

// =============================================================================
// Auth & Core Utilities
// =============================================================================
export { authOptions } from './auth';
export { cn } from './utils';

// =============================================================================
// VALIDATION EXPORTS (Keep existing - Assuming these are correct)
// =============================================================================
export * from './validations'; // Assuming lib/validations/index.ts exports everything correctly

// =============================================================================
// VALIDATION HELPER FUNCTIONS (Keep existing from original index.ts)
// =============================================================================

export function formatValidationErrors(errors: z.ZodIssue[]): string[] {
  return errors.map(error => {
    const path = error.path.join('.')
    return `${path}: ${error.message}`
  })
}

export function validateDateNotInPast(date: string | Date): boolean {
  try {
    const inputDate = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare against start of today
    return !isNaN(inputDate.getTime()) && inputDate >= now;
  } catch {
    return false;
  }
}

export function validatePhoneNumber(phone: string): boolean {
  if (phone === 'À renseigner' || phone === 'Non renseigné') return true; // Allow placeholders
  // Basic check for digits, spaces, hyphens, parens, plus sign
  const phoneRegex = /^[+]?[\d\s\-().]{10,}$/; // Require at least 10 meaningful chars
  return phoneRegex.test(phone);
}