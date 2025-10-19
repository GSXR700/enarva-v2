// lib/index.ts - VERSION NETTOYÉE
// PDF Generators
export { generateInvoicePDF } from './invoice-pdf-generator';
export { generateQuotePDF, prepareQuotePDFData } from './pdf-generator';
export type { QuotePDFData } from './pdf-generator';

// PDF Utilities
export {
  BLUE_PRIMARY,
  TEXT_DARK,
  PAGE_WIDTH,
  PAGE_HEIGHT,
  MARGIN_LEFT,
  MARGIN_RIGHT,
  CONTENT_WIDTH,
  setColor,
  formatCurrency,
  numberToFrenchWords,
  generateObjectTitle,
  loadPDFContent
} from './pdf-utils';

// PDF Templates
export {
  PDF_TEMPLATES,
  SERVICE_TEMPLATES,
  PAYMENT_CONDITIONS,
  DELIVERY_TIMEFRAMES,
  PROPERTY_TYPE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  getTemplate,
  getServiceTemplate,
  getPaymentConditions,
  getPropertyTypeLabel,
  getProductCategoryLabel,
  getDeliveryTimeframe
} from './pdf-templates';
export type { 
  TemplateType, 
  PDFTemplate, 
  ServiceTemplate, 
  PaymentConditionTemplate 
} from './pdf-templates';

// PDF Material Products
export {
  MATERIAL_PRODUCTS,
  getProductsForMaterials,
  mapLeadMaterialsToProductKeys
} from './pdf-material-products';
export type { MaterialProduct } from './pdf-material-products';

// PDF Assets
export { PDF_IMAGES } from './pdf-assets';

// Fonts
export { poppinsNormal, poppinsBold } from './fonts';

// Auth
export { authOptions } from './auth';

// Utils
export { cn } from './utils';