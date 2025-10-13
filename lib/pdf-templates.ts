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
  priceCalculation?: (surface: number, difficulty: string) => number;
  displayType: 'DETAILED' | 'TABLE' | 'MIXED';
}

export const SERVICE_TEMPLATES: Record<string, ServiceTemplate> = {
  FIN_DE_CHANTIER: {
    serviceType: 'FIN_DE_CHANTIER',
    label: 'Nettoyage Fin de chantier',
    defaultPrestations: [
      'Nettoyage et dépoussiérage des plafonds, placards, façades, rideaux et embrasures',
      'Nettoyage ciblé des résidus sur toutes les surfaces (murs, sols, vitres, plinthes)',
      'Nettoyage des interrupteurs, prises, poignées et rampes',
      'Détartrage et désinfection des sanitaires (lavabos, douches, WC, baignoires)',
      'Nettoyage de cuisine : placards, plan de travail, crédences, électroménagers encastrés',
      'Nettoyage complet des vitres et encadrement avec enlèvement des traces de chantier',
      'Entretien et traitement des sols en fonction de leur type'
    ],
    defaultEquipments: [
      'Aspirateur professionnel haute puissance',
      'Monobrosse pour sols durs',
      'Nettoyeur vapeur industriel',
      'Échafaudages et échelles télescopiques',
      'Produits décapants écologiques',
      'Désinfectants professionnels certifiés'
    ],
    teamSizeCalculation: (_surface: number) => Math.ceil(_surface / 50),
    displayType: 'DETAILED'
  },
  GRAND_MENAGE: {
    serviceType: 'GRAND_MENAGE',
    label: 'Grand Ménage',
    defaultPrestations: [
      'Dépoussiérage approfondi de toutes les surfaces',
      'Nettoyage complet des vitres intérieures et extérieures',
      'Désinfection complète de la cuisine et des sanitaires',
      'Aspiration et nettoyage de tous les sols',
      'Nettoyage des placards intérieurs',
      'Élimination des toiles d\'araignées',
      'Nettoyage des luminaires'
    ],
    defaultEquipments: [
      'Aspirateur professionnel',
      'Nettoyeur vapeur',
      'Produits de nettoyage multi-surfaces',
      'Matériel de nettoyage vitres',
      'Désinfectants pour sanitaires'
    ],
    teamSizeCalculation: (_surface: number) => Math.ceil(_surface / 70),
    displayType: 'DETAILED'
  },
  NETTOYAGE_STANDARD: {
    serviceType: 'NETTOYAGE_STANDARD',
    label: 'Nettoyage Standard',
    defaultPrestations: [
      'Dépoussiérage des surfaces',
      'Aspiration des sols',
      'Lavage des sols',
      'Nettoyage des sanitaires',
      'Vider les poubelles'
    ],
    defaultEquipments: [
      'Aspirateur standard',
      'Matériel de lavage sols',
      'Produits de nettoyage basiques'
    ],
    teamSizeCalculation: (_surface: number) => Math.ceil(_surface / 100),
    displayType: 'TABLE'
  },
  NETTOYAGE_BUREAUX: {
    serviceType: 'NETTOYAGE_BUREAUX',
    label: 'Nettoyage Bureaux',
    defaultPrestations: [
      'Dépoussiérage des postes de travail',
      'Aspiration des sols et moquettes',
      'Nettoyage des sanitaires',
      'Vider les corbeilles',
      'Nettoyage des espaces communs'
    ],
    defaultEquipments: [
      'Aspirateur professionnel',
      'Matériel de dépoussiérage',
      'Produits de nettoyage bureaux',
      'Matériel désinfection'
    ],
    teamSizeCalculation: (_surface: number) => Math.ceil(_surface / 80),
    displayType: 'TABLE'
  },
  CRISTALLISATION_MARBRE: {
    serviceType: 'CRISTALLISATION_MARBRE',
    label: 'Cristallisation de marbre',
    defaultPrestations: [
      'Préparation et nettoyage initial du marbre',
      'Ponçage et polissage professionnel',
      'Application de cristallisant',
      'Lustrage haute brillance',
      'Protection finale'
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
  DEVIS_SERVICE_PARTICULIER: {
    title: "Conditions de paiement :",
    conditions: [
      "Les règlements peuvent être effectués par virement bancaire, par chèque ou en espèces.",
      "Un acompte de 30% est demandé à l'initiation du travail."
    ]
  },
  DEVIS_SERVICE_PRO: {
    title: "Conditions de paiement :",
    conditions: [
      "Paiement à 30 jours fin de mois.",
      "Un acompte de 40% est demandé à la signature du contrat."
    ]
  },
  DEVIS_PRODUIT_PRO: {
    title: "Conditions de paiement :",
    conditions: [
      "Paiement à 30 jours fin de mois.",
      "Un acompte de 50% est demandé à la commande."
    ]
  },
  FACTURE_SERVICE: {
    title: "Observations générales :",
    conditions: [
      "Toute réclamation doit être signalée sous 24 heures après la fin de l'intervention.",
      "La présente facture vaut titre exécutoire en cas de non-paiement."
    ]
  },
  FACTURE_PRODUIT: {
    title: "Observations générales :",
    conditions: [
      "Toute réclamation doit être signalée sous 48h après réception.",
      "La présente facture vaut titre exécutoire en cas de non-paiement.",
      "Aucun retour de marchandise ne sera accepté sans accord préalable."
    ]
  },
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
    return PAYMENT_CONDITIONS['FACTURE_PRODUIT'] ?? PAYMENT_CONDITIONS['FACTURE_SERVICE'] ?? defaultConditions;
  }
  
  if (docType === 'BON_LIVRAISON') {
    return PAYMENT_CONDITIONS['BON_LIVRAISON'] ?? defaultConditions;
  }
  
  if (isB2B) {
    if (businessType === 'SERVICE') {
      return PAYMENT_CONDITIONS['DEVIS_SERVICE_PRO'] ?? PAYMENT_CONDITIONS['DEVIS_SERVICE_PARTICULIER'] ?? defaultConditions;
    }
    return PAYMENT_CONDITIONS['DEVIS_PRODUIT_PRO'] ?? PAYMENT_CONDITIONS['DEVIS_SERVICE_PARTICULIER'] ?? defaultConditions;
  }
  
  return PAYMENT_CONDITIONS['DEVIS_SERVICE_PARTICULIER'] ?? defaultConditions;
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