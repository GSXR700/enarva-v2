// lib/pdf-templates.ts - PDF TEMPLATE DEFINITIONS AND CONFIGURATIONS

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

export const PDF_TEMPLATES: Record<TemplateType, PDFTemplate> = {
  SERVICE_QUOTE: {
    type: 'SERVICE_QUOTE',
    hasBlueHeader: true,
    hasBlueFooter: true,
    showLogo: true,
    showBarcode: true,
    headerHeight: 120,
    footerHeight: 120,
    margins: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40
    },
    colors: {
      primary: [30, 58, 138],
      secondary: [28, 63, 145],
      text: [33, 33, 33]
    }
  },
  PRODUCT_QUOTE: {
    type: 'PRODUCT_QUOTE',
    hasBlueHeader: true,
    hasBlueFooter: true,
    showLogo: true,
    showBarcode: true,
    headerHeight: 120,
    footerHeight: 120,
    margins: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40
    },
    colors: {
      primary: [30, 58, 138],
      secondary: [28, 63, 145],
      text: [33, 33, 33]
    }
  },
  INVOICE: {
    type: 'INVOICE',
    hasBlueHeader: true,
    hasBlueFooter: true,
    showLogo: true,
    showBarcode: true,
    headerHeight: 120,
    footerHeight: 120,
    margins: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40
    },
    colors: {
      primary: [30, 58, 138],
      secondary: [28, 63, 145],
      text: [33, 33, 33]
    }
  },
  DELIVERY_NOTE: {
    type: 'DELIVERY_NOTE',
    hasBlueHeader: true,
    hasBlueFooter: false,
    showLogo: true,
    showBarcode: false,
    headerHeight: 100,
    footerHeight: 60,
    margins: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40
    },
    colors: {
      primary: [30, 58, 138],
      secondary: [28, 63, 145],
      text: [33, 33, 33]
    }
  },
  PAYSLIP: {
    type: 'PAYSLIP',
    hasBlueHeader: true,
    hasBlueFooter: false,
    showLogo: false,
    showBarcode: false,
    headerHeight: 100,
    footerHeight: 60,
    margins: {
      top: 40,
      bottom: 40,
      left: 40,
      right: 40
    },
    colors: {
      primary: [30, 58, 138],
      secondary: [28, 63, 145],
      text: [33, 33, 33]
    }
  }
};

export interface ServiceTemplate {
  serviceType: string;
  label: string;
  defaultPrestations: string[];
  defaultEquipments: string[];
  teamSizeCalculation: (surface: number) => number;
  priceCalculation?: (surface: number) => number;
  displayType: 'TABLE' | 'DETAILED';
}

export const SERVICE_TEMPLATES: Record<string, ServiceTemplate> = {
  FIN_DE_CHANTIER: {
    serviceType: 'FIN_DE_CHANTIER',
    label: 'Nettoyage Fin de chantier',
    defaultPrestations: [
      'Dépoussiérage complet (plafonds, menuiseries, façades, rideaux), élimination des résidus de chantier',
      'Détartrage et désinfection des sanitaires et de la cuisine, nettoyage des vitres et encadrements'
    ],
    defaultEquipments: [
      'Aspirateurs professionnels eau et poussière, monobrosse TASKI multi-vitesses et nettoyeur vapeur EMILIO-RA',
      'Matériel général de ménage et de désinfection, échelles et équipements d\'accès en hauteur'
    ],
    teamSizeCalculation: (surface: number) => Math.ceil(surface / 80),
    displayType: 'DETAILED'
  },
  REMISE_EN_ETAT: {
    serviceType: 'REMISE_EN_ETAT',
    label: 'Remise en état',
    defaultPrestations: [
      'Nettoyage en profondeur de toutes les surfaces',
      'Décapage et traitement des sols',
      'Désinfection complète',
      'Élimination des taches tenaces'
    ],
    defaultEquipments: [
      'Mono-brosse professionnelle',
      'Autolaveuse industrielle',
      'Équipement de décapage',
      'Produits professionnels adaptés'
    ],
    teamSizeCalculation: (surface: number) => Math.ceil(surface / 70),
    displayType: 'DETAILED'
  },
  NETTOYAGE_CANAPES: {
    serviceType: 'NETTOYAGE_CANAPES',
    label: 'Nettoyage de canapés',
    defaultPrestations: [
      'Aspiration et dépoussiérage complet',
      'Détachage ciblé des taches',
      'Nettoyage en profondeur à la vapeur',
      'Désodorisation et protection textile'
    ],
    defaultEquipments: [
      'Nettoyeur vapeur professionnel',
      'Injecteur-extracteur textile',
      'Produits spécialisés tissus',
      'Matériel de détachage professionnel'
    ],
    teamSizeCalculation: (_surface: number) => 2,
    displayType: 'TABLE'
  },
  NETTOYAGE_MOQUETTES: {
    serviceType: 'NETTOYAGE_MOQUETTES',
    label: 'Nettoyage de moquettes',
    defaultPrestations: [
      'Aspiration haute puissance',
      'Pré-traitement des taches',
      'Injection-extraction profonde',
      'Séchage et brossage final'
    ],
    defaultEquipments: [
      'Aspirateur industriel',
      'Injecteur-extracteur professionnel',
      'Produits spécialisés moquettes',
      'Ventilateurs de séchage'
    ],
    teamSizeCalculation: (surface: number) => Math.ceil(surface / 100),
    displayType: 'TABLE'
  },
  DECAPAGE_CRISTALLISATION: {
    serviceType: 'DECAPAGE_CRISTALLISATION',
    label: 'Décapage et cristallisation',
    defaultPrestations: [
      'Décapage complet du revêtement',
      'Nettoyage en profondeur',
      'Application de cristallisant',
      'Polissage haute brillance',
      'Protection longue durée'
    ],
    defaultEquipments: [
      'Monobrosse professionnelle',
      'Disques de cristallisation',
      'Produits cristallisants spécialisés',
      'Matériel de polissage',
      'Aspirateur à eau'
    ],
    teamSizeCalculation: (_surface: number) => Math.ceil(_surface / 60),
    displayType: 'DETAILED'
  },
  NETTOYAGE_VITRES: {
    serviceType: 'NETTOYAGE_VITRES',
    label: 'Nettoyage de vitres',
    defaultPrestations: [
      'Nettoyage intérieur des vitres',
      'Nettoyage extérieur des vitres',
      'Nettoyage des cadres',
      'Élimination des traces',
      'Séchage professionnel'
    ],
    defaultEquipments: [
      'Perches télescopiques',
      'Raclettes professionnelles',
      'Produits vitres professionnels',
      'Échelles sécurisées',
      'Matériel d\'accès en hauteur'
    ],
    teamSizeCalculation: (_surface: number) => Math.ceil(_surface / 100),
    displayType: 'TABLE'
  },
  ENTRETIEN_REGULIER: {
    serviceType: 'ENTRETIEN_REGULIER',
    label: 'Entretien Régulier',
    defaultPrestations: [
      'Nettoyage quotidien des surfaces',
      'Entretien des sols',
      'Nettoyage des sanitaires',
      'Maintien de la propreté générale'
    ],
    defaultEquipments: [
      'Équipement standard de nettoyage',
      'Produits d\'entretien écologiques'
    ],
    teamSizeCalculation: (_surface: number) => Math.ceil(_surface / 100),
    displayType: 'TABLE'
  }
};

export interface PaymentConditionTemplate {
  title: string;
  conditions: string[];
}

export const PAYMENT_CONDITIONS: Record<string, PaymentConditionTemplate> = {
  // ========== DEVIS SERVICE ==========
  DEVIS_SERVICE_PARTICULIER: {
    title: "Conditions de paiement :",
    conditions: [
      "Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.",
      "Un acompte de 30% du montant total est exigible à la signature pour début des prestations."
    ]
  },
  DEVIS_SERVICE_PRO: {
    title: "Conditions de paiement :",
    conditions: [
      "Paiement à 30 jours fin de mois.",
      "Un acompte de 30% du montant total est exigible à la signature pour début des prestations."
    ]
  },

  // ========== DEVIS PRODUIT ==========
  DEVIS_PRODUIT_PARTICULIER: {
    title: "Conditions de paiement :",
    conditions: [
      "Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.",
      "Un acompte de 30% du montant total est exigible à la commande."
    ]
  },
  DEVIS_PRODUIT_PRO: {
    title: "Conditions de paiement :",
    conditions: [
      "Paiement à 30 jours fin de mois.",
      "Un acompte de 30% du montant total est exigible à la commande."
    ]
  },

  // ========== FACTURE SERVICE ==========
  FACTURE_SERVICE: {
    title: "Observations générales :",
    conditions: [
      "Toute réclamation doit être signalée sous 24 heures après la fin de l'intervention.",
      "La présente facture vaut titre exécutoire en cas de non-paiement."
    ]
  },

  // ========== FACTURE PRODUIT ==========
  FACTURE_PRODUIT: {
    title: "Observations générales :",
    conditions: [
      "Toute réclamation doit être signalée sous 48h après la livraison.",
      "Les marchandises voyagent aux risques et périls du destinataire.",
      "La présente facture vaut titre exécutoire en cas de non-paiement."
    ]
  },

  // ========== BON DE LIVRAISON ==========
  BON_LIVRAISON: {
    title: "Observations générales :",
    conditions: [
      "Toute réclamation doit être signalée sous 48h après la livraison.",
      "La livraison a été effectuée selon le bon de commande.",
      "Le client s'engage à vérifier la conformité avant de signer.",
      "Tout produit endommagé doit être signalé immédiatement au livreur."
    ]
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
  APARTMENT_SMALL: "appartement",
  APARTMENT_MEDIUM: "appartement",
  APARTMENT_LARGE: "appartement",
  APARTMENT_MULTI: "appartement multi-niveaux",
  VILLA_SMALL: "villa",
  VILLA_MEDIUM: "villa",
  VILLA_LARGE: "villa",
  PENTHOUSE: "penthouse",
  COMMERCIAL: "local commercial",
  STORE: "magasin",
  HOTEL_STANDARD: "hôtel",
  HOTEL_LUXURY: "hôtel de luxe",
  OFFICE: "bureau",
  RESIDENCE_B2B: "résidence",
  BUILDING: "immeuble",
  RESTAURANT: "restaurant",
  WAREHOUSE: "entrepôt",
  OTHER: "espace"
};

export const PRODUCT_CATEGORY_LABELS: Record<string, string> = {
  EQUIPEMENT: "Équipement de nettoyage",
  PRODUIT_CHIMIQUE: "Produits chimiques",
  ACCESSOIRE: "Accessoires",
  CONSOMMABLE: "Consommables",
  CLEANING_SUPPLIES: "Fournitures de nettoyage",
  EQUIPMENT: "Équipement",
  CHEMICALS: "Produits chimiques",
  TOOLS: "Outils",
  OTHER: "Divers",
  AUTRE: "Divers"
};

export function getTemplate(type: TemplateType): PDFTemplate {
  return PDF_TEMPLATES[type];
}

export function getServiceTemplate(serviceType: string): ServiceTemplate | null {
  return SERVICE_TEMPLATES[serviceType] || null;
}

export function getPaymentConditions(
  docType: 'DEVIS' | 'FACTURE' | 'BON_LIVRAISON',
  businessType: 'SERVICE' | 'PRODUCT',
  isB2B: boolean
): PaymentConditionTemplate {
  const defaultConditions: PaymentConditionTemplate = {
    title: "Conditions de paiement :",
    conditions: [
      "Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces."
    ]
  };

  if (docType === 'FACTURE') {
    if (businessType === 'SERVICE') {
      return PAYMENT_CONDITIONS['FACTURE_SERVICE'] ?? defaultConditions;
    }
    return PAYMENT_CONDITIONS['FACTURE_PRODUIT'] ?? defaultConditions;
  }
  
  if (docType === 'BON_LIVRAISON') {
    return PAYMENT_CONDITIONS['BON_LIVRAISON'] ?? defaultConditions;
  }
  
  // DEVIS
  if (businessType === 'SERVICE') {
    return isB2B 
      ? (PAYMENT_CONDITIONS['DEVIS_SERVICE_PRO'] ?? defaultConditions)
      : (PAYMENT_CONDITIONS['DEVIS_SERVICE_PARTICULIER'] ?? defaultConditions);
  }
  
  // PRODUCT
  return isB2B 
    ? (PAYMENT_CONDITIONS['DEVIS_PRODUIT_PRO'] ?? defaultConditions)
    : (PAYMENT_CONDITIONS['DEVIS_PRODUIT_PARTICULIER'] ?? defaultConditions);
}

export function getPropertyTypeLabel(propertyType: string | null): string {
  if (!propertyType) return 'bien';
  return PROPERTY_TYPE_LABELS[propertyType] ?? 'bien';
}

export function getProductCategoryLabel(category: string | null): string {
  if (!category) return 'Produits';
  return PRODUCT_CATEGORY_LABELS[category] ?? 'Produits';
}

export function getDeliveryTimeframe(deliveryType: string | null): string {
  if (!deliveryType) return '3-5 jours ouvrés';
  return DELIVERY_TIMEFRAMES[deliveryType] ?? '3-5 jours ouvrés';
}

export default {
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
};