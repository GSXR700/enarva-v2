// lib/pdf-templates.ts - UPDATED PDF TEMPLATE DEFINITIONS AND CONFIGURATIONS
import { ServiceType } from '@prisma/client'; // Import ServiceType

export type TemplateType = 'SERVICE_QUOTE' | 'PRODUCT_QUOTE' | 'INVOICE' | 'DELIVERY_NOTE' | 'PAYSLIP';

export interface PDFTemplate {
  type: TemplateType;
  hasBlueHeader: boolean;
  hasBlueFooter: boolean;
  showLogo: boolean;
  showBarcode: boolean;
  headerHeight: number;
  footerHeight: number;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  colors: {
    primary: readonly [number, number, number];
    secondary: readonly [number, number, number];
    text: readonly [number, number, number];
  };
}

// PDF_TEMPLATES remains unchanged as it defines layout, not content per service
export const PDF_TEMPLATES: Record<TemplateType, PDFTemplate> = {
  SERVICE_QUOTE: {
    type: 'SERVICE_QUOTE',
    hasBlueHeader: true,
    hasBlueFooter: true,
    showLogo: true,
    showBarcode: true,
    headerHeight: 120, // Adjusted based on original pdf-generator
    footerHeight: 120, // Adjusted based on original pdf-generator
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    colors: { primary: [30, 58, 138], secondary: [59, 130, 246], text: [33, 33, 33] } // Use secondary color consistent with pdf-generator
  },
  PRODUCT_QUOTE: {
    type: 'PRODUCT_QUOTE',
    hasBlueHeader: true,
    hasBlueFooter: true,
    showLogo: true,
    showBarcode: true,
    headerHeight: 120,
    footerHeight: 120,
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    colors: { primary: [30, 58, 138], secondary: [59, 130, 246], text: [33, 33, 33] }
  },
  INVOICE: {
    type: 'INVOICE',
    hasBlueHeader: true,
    hasBlueFooter: true,
    showLogo: true,
    showBarcode: true,
    headerHeight: 120,
    footerHeight: 120,
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    colors: { primary: [30, 58, 138], secondary: [59, 130, 246], text: [33, 33, 33] }
  },
  DELIVERY_NOTE: {
    type: 'DELIVERY_NOTE',
    hasBlueHeader: true,
    hasBlueFooter: false,
    showLogo: true,
    showBarcode: false,
    headerHeight: 100,
    footerHeight: 60,
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    colors: { primary: [30, 58, 138], secondary: [59, 130, 246], text: [33, 33, 33] }
  },
  PAYSLIP: { // Assuming PAYSLIP might be needed later
    type: 'PAYSLIP',
    hasBlueHeader: true,
    hasBlueFooter: false,
    showLogo: false,
    showBarcode: false,
    headerHeight: 100,
    footerHeight: 60,
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    colors: { primary: [30, 58, 138], secondary: [59, 130, 246], text: [33, 33, 33] }
  }
};

// Interface for Service specific defaults (Match pdf-content structure more closely)
export interface ServiceDefaults {
  label: string;
  defaultPrestations: string[];
  defaultEquipments: string[];
  teamSizePerSqMeter?: number; // Optional: calculation based on sq meter
  baseTeamSize?: number;      // Optional: base team size
  defaultDuration?: string;   // Optional: default estimated duration string
  // displayType?: 'TABLE' | 'DETAILED'; // This seems less relevant now with custom fields
}

// Updated SERVICE_TEMPLATES using ServiceDefaults structure and all ServiceType enums
// IMPORTANT: Review and refine defaultPrestations and defaultEquipments for each service!
export const SERVICE_DEFAULTS: Record<ServiceType, ServiceDefaults> = {
  [ServiceType.GRAND_MENAGE]: {
    label: "Grand Ménage",
    defaultPrestations: [
      "Dépoussiérage approfondi toutes surfaces",
      "Nettoyage complet des vitres et menuiseries",
      "Désinfection et détartrage cuisine et sanitaires",
      "Nettoyage intérieur/extérieur des placards",
      "Lessivage portes et plinthes",
      "Traitement des sols adapté"
    ],
    defaultEquipments: [
      "Aspirateur eau et poussière", "Nettoyeur vapeur", "Matériel vitrerie", "Chariots équipés", "Produits écologiques professionnels"
    ],
    teamSizePerSqMeter: 70,
    baseTeamSize: 2,
    defaultDuration: "4-8 heures selon état/surface"
  },
  [ServiceType.NETTOYAGE_FIN_CHANTIER]: {
    label: "Nettoyage Fin de chantier",
    defaultPrestations: [
        "Évacuation résidus fins", "Dépoussiérage/lessivage murs et plafonds", "Nettoyage traces (colle, peinture...)", "Nettoyage approfondi vitres et menuiseries", "Désinfection sanitaires et cuisine", "Nettoyage grilles ventilation", "Remise en état des sols"
    ],
    defaultEquipments: [
        "Aspirateur industriel", "Monobrosse/Autolaveuse", "Nettoyeur vapeur", "Grattoirs spécifiques", "Matériel accès hauteur", "Produits décapants légers et désinfectants"
    ],
    teamSizePerSqMeter: 50,
    baseTeamSize: 2,
    defaultDuration: "1-2 jours selon chantier"
  },
  [ServiceType.ENTRETIEN_REGULIER]: {
    label: "Entretien Régulier",
    defaultPrestations: [
        "Dépoussiérage surfaces accessibles", "Aspiration/lavage sols", "Nettoyage/désinfection sanitaires", "Nettoyage kitchenette", "Vidage corbeilles", "Nettoyage traces (portes, interrupteurs)"
    ],
    defaultEquipments: [
        "Aspirateur professionnel", "Chariot de ménage", "Microfibres", "Produits écologiques courants"
    ],
    teamSizePerSqMeter: 100, // Highly variable
    baseTeamSize: 1,
    defaultDuration: "Selon contrat"
  },
  [ServiceType.NETTOYAGE_BUREAUX]: {
    label: "Nettoyage Bureaux",
     defaultPrestations: [
        "Dépoussiérage humide postes de travail", "Aspiration sols", "Lavage sols durs", "Nettoyage/désinfection sanitaires", "Nettoyage espace cuisine/détente", "Vidage poubelles", "Désinfection points de contact"
    ],
    defaultEquipments: [
        "Aspirateur silencieux", "Chariot de ménage", "Autolaveuse (si grande surface)", "Produits désinfectants virucides", "Produits écologiques"
    ],
    teamSizePerSqMeter: 80,
    baseTeamSize: 1,
    defaultDuration: "Selon contrat (ex: Quotidien)"
  },
  [ServiceType.DESINFECTION_SANITAIRE]: {
    label: "Désinfection Sanitaire",
     defaultPrestations: [
        "Nettoyage et détartrage complets (WC, lavabos, douches)", "Désinfection toutes surfaces", "Nettoyage/désinfection sols", "Traitement anti-odeurs", "Remplacement consommables"
    ],
    defaultEquipments: [
        "Nettoyeur vapeur", "Pulvérisateur", "Produits détartrants", "Désinfectants professionnels"
    ],
    teamSizePerSqMeter: 50, // Per area
    baseTeamSize: 1,
    defaultDuration: "1-3 heures"
  },
  [ServiceType.NETTOYAGE_CANAPES_MATELAS]: {
    label: "Nettoyage Canapés & Matelas",
    defaultPrestations: [
        "Diagnostic textile/cuir", "Aspiration profonde anti-acariens", "Pré-traitement taches", "Nettoyage injection-extraction (textile) / Nettoyage spécifique (cuir)", "Traitement désodorisant", "Séchage partiel"
    ],
    defaultEquipments: [
        "Injecteur-extracteur (Kärcher Puzzi)", "Aspirateur puissant", "Détachants spécifiques", "Nettoyants textiles/cuir", "Brosses douces"
    ],
    baseTeamSize: 1,
    defaultDuration: "1-3h / élément"
  },
  [ServiceType.NETTOYAGE_TAPIS_MOQUETTES]: {
    label: "Nettoyage Tapis & Moquettes",
    defaultPrestations: [
        "Aspiration haute puissance", "Traitement taches", "Shampouinage injection-extraction", "Nettoyage monobrosse (si nécessaire)", "Traitement anti-acariens et désodorisant"
    ],
    defaultEquipments: [
        "Injecteur-extracteur", "Monobrosse", "Nettoyeur vapeur (option)", "Aspirateur bi-moteur", "Shampoing moquette, détachants"
    ],
    teamSizePerSqMeter: 30,
    baseTeamSize: 1,
    defaultDuration: "Variable"
  },
  [ServiceType.NETTOYAGE_VITRES]: {
    label: "Nettoyage Vitres",
    defaultPrestations: [
        "Nettoyage surfaces vitrées (int/ext)", "Nettoyage encadrements et rebords", "Dépoussiérage rainures", "Élimination traces", "Finition sans traces"
    ],
    defaultEquipments: [
        "Mouilleur, raclettes", "Perches télescopiques", "Produit vitres écologique", "Microfibres spécifiques", "Échelles sécurisées"
    ],
    teamSizePerSqMeter: 100, // Often per window/m²
    baseTeamSize: 1,
    defaultDuration: "Variable"
  },
  [ServiceType.NETTOYAGE_FACADE]: {
    label: "Nettoyage Façade",
    defaultPrestations: [
        "Diagnostic revêtement", "Nettoyage HP/BP adapté", "Application anti-mousse (si nécessaire)", "Nettoyage vitres façade", "Rinçage complet", "Protection hydrofuge (option)"
    ],
    defaultEquipments: [
        "Nettoyeur haute pression réglable", "Nacelle/Échafaudage", "Pulvérisateur", "Produits façade spécifiques", "EPI"
    ],
    teamSizePerSqMeter: 40,
    baseTeamSize: 2,
    defaultDuration: "1+ jours"
  },
  [ServiceType.TRAITEMENT_SOL]: {
    label: "Traitement de Sol",
    defaultPrestations: ["Décapage ou Nettoyage préparatoire", "Application du traitement spécifique (cire, émulsion, protecteur...)", "Lustrage si applicable"],
    defaultEquipments: ["Monobrosse", "Aspirateur à eau", "Produits spécifiques au type de sol et traitement"],
    teamSizePerSqMeter: 60,
    baseTeamSize: 1,
    defaultDuration: "Variable"
  },
  [ServiceType.CRISTALLISATION_MARBRE]: {
    label: "Cristallisation Marbre",
     defaultPrestations: [
        "Protection zones adjacentes", "Décapage si nécessaire", "Application produit cristallisant", "Passage monobrosse (laine acier/disque)", "Lustrage haute brillance"
    ],
    defaultEquipments: [
        "Monobrosse haute vitesse", "Disques laine d'acier/cristallisation", "Aspirateur à eau", "Produit cristallisant", "Décapant (option)"
    ],
    teamSizePerSqMeter: 60,
    baseTeamSize: 1,
    defaultDuration: "~1h / 15m²"
  },
  [ServiceType.VITRIFICATION_PARQUET]: {
    label: "Vitrification Parquet",
    defaultPrestations: [
        "Protection plinthes/murs", "Ponçage multi-passes", "Aspiration", "Application fond dur", "Application 2-3 couches vitrificateur", "Égrenage inter-couches"
    ],
    defaultEquipments: [
        "Ponceuse parquet", "Bordeuse", "Aspirateur industriel", "Rouleaux/pinceaux spécifiques", "Fond dur, vitrificateur", "Abrasifs"
    ],
    teamSizePerSqMeter: 40,
    baseTeamSize: 1,
    defaultDuration: "2-4 jours (avec séchage)"
  },
  [ServiceType.DECAPAGE_SOL]: {
    label: "Décapage Sol",
    defaultPrestations: [
        "Protection zones adjacentes", "Application décapant", "Action mécanique monobrosse", "Aspiration résidus", "Rinçages multiples", "Neutralisation (si besoin)", "Séchage"
    ],
    defaultEquipments: [
        "Monobrosse basse vitesse", "Disques abrasifs (noir...)", "Aspirateur à eau", "Produit décapant puissant", "Neutralisant (option)"
    ],
    teamSizePerSqMeter: 50,
    baseTeamSize: 1,
    defaultDuration: "Variable"
  },
  [ServiceType.LUSTRAGE_MARBRE]: {
    label: "Lustrage Marbre",
    defaultPrestations: [
        "Nettoyage préalable", "Pulvérisation produit entretien/spray", "Passage monobrosse haute vitesse (disque adapté)", "Essuyage résidus"
    ],
    defaultEquipments: [
        "Monobrosse (T)HS", "Disques lustrage (blanc...)", "Produit spray méthode", "Pulvérisateur"
    ],
    teamSizePerSqMeter: 100,
    baseTeamSize: 1,
    defaultDuration: "~1h / 75m²"
  },
  [ServiceType.POLISSAGE_BETON]: {
    label: "Polissage Béton",
     defaultPrestations: [
        "Préparation surface", "Ponçage disques diamantés (grains décroissants)", "Application durcisseur/densifieur", "Passages polissage", "Application bouche-pores/protecteur (option)"
    ],
    defaultEquipments: [
        "Surfaceuse/Polisseuse béton", "Disques diamantés (métal/résine)", "Aspirateur industriel", "Durcisseur silicate", "Protecteur"
    ],
    teamSizePerSqMeter: 40,
    baseTeamSize: 1,
    defaultDuration: "Variable (plusieurs jours)"
  },
  [ServiceType.RENOVATION_SOL]: {
    label: "Rénovation Sol",
    defaultPrestations: [
        "Diagnostic", "Décapage/Ponçage", "Nettoyage profond", "Réparations mineures", "Application protection", "Lustrage (option)"
    ],
    defaultEquipments: [
        "Monobrosse", "Ponceuse (option)", "Aspirateur", "Produits adaptés"
    ],
    teamSizePerSqMeter: 50,
    baseTeamSize: 1,
    defaultDuration: "1+ jours"
  },
  [ServiceType.TRAITEMENT_ANTI_NUISIBLE]: {
    label: "Traitement Anti-Nuisible",
    defaultPrestations: [
        "Inspection & Identification", "Diagnostic sources", "Prévention", "Application traitements ciblés (gel, pulvérisation, appâts...)", "Suivi (option)"
    ],
    defaultEquipments: [
        "Pulvérisateur", "Nébulisateur (option)", "Pistolet gel", "Boîtes appâtage", "Produits homologués", "EPI"
    ],
    teamSizePerSqMeter: 150, // Per intervention area
    baseTeamSize: 1,
    defaultDuration: "1-4 heures"
  },
  [ServiceType.LAVAGE_VOITURE_DOMICILE]: {
    label: "Lavage Voiture à Domicile",
    defaultPrestations: [
        "Prélavage", "Lavage manuel carrosserie", "Nettoyage jantes/roues", "Séchage microfibre", "Nettoyage vitres (int/ext)", "Aspiration habitacle/coffre", "Nettoyage plastiques intérieurs"
    ],
    defaultEquipments: [
        "Nettoyeur HP portable / Lavage sans eau", "Aspirateur portable", "Gants, microfibres", "Shampoing pH neutre, nettoyants spécifiques"
    ],
    baseTeamSize: 1,
    defaultDuration: "1.5 - 3 heures"
  },
  [ServiceType.ENTRETIEN_JARDIN]: {
    label: "Entretien Jardin",
    defaultPrestations: ["Tonte pelouse", "Taille haies/arbustes", "Désherbage", "Ramassage feuilles", "Évacuation déchets verts"],
    defaultEquipments: ["Tondeuse", "Taille-haie", "Débroussailleuse", "Souffleur", "Outils manuels"],
    teamSizePerSqMeter: 200, // Highly variable
    baseTeamSize: 1,
    defaultDuration: "Selon surface/tâches"
  },
  [ServiceType.ENTRETIEN_PISCINE]: {
    label: "Entretien Piscine",
     defaultPrestations: [
        "Nettoyage bassin", "Analyse eau", "Ajustement chimie", "Nettoyage skimmers/préfiltre", "Contre-lavage filtre", "Vérification équipements"
    ],
    defaultEquipments: [
        "Robot/Aspirateur piscine", "Épuisette, Brosse", "Kit analyse", "Produits chimiques"
    ],
    teamSizePerSqMeter: 100, // Per pool
    baseTeamSize: 1,
    defaultDuration: "1 - 1.5 heure"
  },
  [ServiceType.NETTOYAGE_FOURS]: {
    label: "Nettoyage Fours",
    defaultPrestations: ["Décapage graisses cuites", "Nettoyage intérieur/extérieur", "Nettoyage grilles/accessoires"],
    defaultEquipments: ["Produits décapants four professionnels", "Grattoirs", "Éponges abrasives", "Vapeur (option)"],
    baseTeamSize: 1,
    defaultDuration: "1-3 heures"
  },
  [ServiceType.AUTRES]: {
    label: "Autres Services",
    defaultPrestations: ["Prestation sur mesure selon demande spécifique."],
    defaultEquipments: ["Équipement défini selon la prestation."],
    baseTeamSize: 1,
    defaultDuration: "À définir"
  }
};

// --- Other Constants (Unchanged) ---
export interface PaymentConditionTemplate {
  title: string;
  conditions: string[];
}

export const PAYMENT_CONDITIONS: Record<string, PaymentConditionTemplate> = {
  DEVIS_SERVICE_PARTICULIER: {
    title: "Conditions de paiement :",
    conditions: ["Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.","Un acompte de 30% du montant total est exigible à la signature pour début des prestations."]
  },
  DEVIS_SERVICE_PRO: {
    title: "Conditions de paiement :",
    conditions: ["Paiement à 30 jours fin de mois.","Un acompte de 30% du montant total est exigible à la signature pour début des prestations."]
  },
  DEVIS_PRODUIT_PARTICULIER: {
    title: "Conditions de paiement :",
    conditions: ["Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.","Un acompte de 30% du montant total est exigible à la commande."]
  },
  DEVIS_PRODUIT_PRO: {
    title: "Conditions de paiement :",
    conditions: ["Paiement à 30 jours fin de mois.","Un acompte de 30% du montant total est exigible à la commande."]
  },
  FACTURE_SERVICE: {
    title: "Observations générales :",
    conditions: ["Toute réclamation doit être signalée sous 24 heures après la fin de l'intervention.","La présente facture vaut titre exécutoire en cas de non-paiement."]
  },
  FACTURE_PRODUIT: {
    title: "Observations générales :",
    conditions: ["Toute réclamation doit être signalée sous 48h après la livraison.","Les marchandises voyagent aux risques et périls du destinataire.","La présente facture vaut titre exécutoire en cas de non-paiement."]
  },
  BON_LIVRAISON: {
    title: "Observations générales :",
    conditions: ["Toute réclamation doit être signalée sous 48h après la livraison.","La livraison a été effectuée selon le bon de commande.","Le client s'engage à vérifier la conformité avant de signer.","Tout produit endommagé doit être signalé immédiatement au livreur."]
  }
};

export const DELIVERY_TIMEFRAMES: Record<string, string> = {
  STANDARD: "3-5 jours ouvrés",
  EXPRESS: "24-48 heures",
  URGENT: "Intervention sous 24h",
  SCHEDULED: "Selon planning convenu",
  CUSTOM: "À définir selon disponibilités"
};

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  APARTMENT_SMALL:"Appartement (<60m²)", // More specific labels
  APARTMENT_MEDIUM:"Appartement (60-100m²)",
  APARTMENT_LARGE:"Appartement (>100m²)",
  APARTMENT_MULTI:"Appartement Multi-niveaux/Duplex",
  VILLA_SMALL:"Villa (<150m²)",
  VILLA_MEDIUM:"Villa (150-300m²)",
  VILLA_LARGE:"Villa (>300m²)",
  PENTHOUSE:"Penthouse",
  COMMERCIAL:"Local Commercial",
  STORE:"Magasin / Boutique",
  HOTEL_STANDARD:"Hôtel",
  HOTEL_LUXURY:"Hôtel de Luxe / Riad",
  OFFICE:"Bureau / Plateau de bureaux",
  RESIDENCE_B2B:"Résidence / Immeuble (Parties Communes)",
  BUILDING:"Immeuble Complet",
  RESTAURANT:"Restaurant / Café",
  WAREHOUSE:"Entrepôt / Local Industriel",
  OTHER:"Autre Type de Bien"
};

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  // Use Prisma Enum values (if applicable and imported) or keep as strings
  FURNITURE: "Mobilier",
  EQUIPMENT: "Équipement",
  CONSUMABLES: "Consommables",
  ELECTRONICS: "Électronique",
  DECORATION: "Décoration",
  TEXTILES: "Textiles",
  LIGHTING: "Éclairage",
  STORAGE: "Rangement",
  KITCHEN_ITEMS: "Articles de cuisine",
  BATHROOM_ITEMS: "Articles de salle de bain",
  OFFICE_SUPPLIES: "Fournitures de bureau",
  CLEANING_PRODUCTS: "Produits de Nettoyage", // Added from schema
  PROTECTIVE_GEAR: "Équipement Protection", // Added from schema
  OTHER: "Autre"
};


// --- Helper Functions (Updated) ---

export function getTemplate(type: TemplateType): PDFTemplate {
  return PDF_TEMPLATES[type] ?? PDF_TEMPLATES['SERVICE_QUOTE']; // Provide default
}

// Updated to use SERVICE_DEFAULTS and ServiceType enum
export function getServiceDefaults(serviceType: ServiceType | string | null): ServiceDefaults | null {
   if (!serviceType || !ServiceType[serviceType as ServiceType]) {
       return null; // Return null if invalid service type
   }
   // Cast to ServiceType after validation
   return SERVICE_DEFAULTS[serviceType as ServiceType] ?? null;
}


export function getPaymentConditions(
  docType: 'DEVIS' | 'FACTURE' | 'BON_LIVRAISON',
  businessType: 'SERVICE' | 'PRODUCT',
  isB2B: boolean
): PaymentConditionTemplate {
  const defaultConditions: PaymentConditionTemplate = {
    title: "Conditions :",
    conditions: ["Paiement à la commande/livraison."]
  };

  let key: string | null = null;

  if (docType === 'FACTURE') {
    key = businessType === 'SERVICE' ? 'FACTURE_SERVICE' : 'FACTURE_PRODUIT';
  } else if (docType === 'BON_LIVRAISON') {
    key = 'BON_LIVRAISON';
  } else { // DEVIS
    if (businessType === 'SERVICE') {
      key = isB2B ? 'DEVIS_SERVICE_PRO' : 'DEVIS_SERVICE_PARTICULIER';
    } else { // PRODUCT
      key = isB2B ? 'DEVIS_PRODUIT_PRO' : 'DEVIS_PRODUIT_PARTICULIER';
    }
  }

  // Use optional chaining and nullish coalescing for safety
  return (key ? PAYMENT_CONDITIONS[key] : undefined) ?? defaultConditions;
}


export function getPropertyTypeLabel(propertyType: string | null): string {
  if (!propertyType) return 'bien';
  return PROPERTY_TYPE_LABELS[propertyType] ?? propertyType.replace(/_/g, ' '); // Fallback to formatted key
}

export function getProductCategoryLabel(category: string | null): string {
  if (!category) return 'Produits';
  return PRODUCT_CATEGORY_LABELS[category] ?? category.replace(/_/g, ' '); // Fallback to formatted key
}

export function getDeliveryTimeframe(deliveryType: string | null): string {
  if (!deliveryType) return DELIVERY_TIMEFRAMES['STANDARD'] ?? '3-5 jours ouvrés'; // Default to STANDARD
  return DELIVERY_TIMEFRAMES[deliveryType] ?? DELIVERY_TIMEFRAMES['STANDARD'] ?? '3-5 jours ouvrés'; // Fallback
}

// Keep default export if other files rely on it
export default {
  PDF_TEMPLATES,
  SERVICE_DEFAULTS, // Export new defaults object
  PAYMENT_CONDITIONS,
  DELIVERY_TIMEFRAMES,
  PROPERTY_TYPE_LABELS,
  PRODUCT_CATEGORY_LABELS,
  getTemplate,
  getServiceDefaults, // Export new function
  getPaymentConditions,
  getPropertyTypeLabel,
  getProductCategoryLabel,
  getDeliveryTimeframe
};