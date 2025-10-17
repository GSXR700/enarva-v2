// lib/pdf-material-products.ts
export interface MaterialProduct {
  name: string;
  description?: string;
  unit?: string;
  category: 'CLEANING_PRODUCTS' | 'EQUIPMENT' | 'CONSUMABLES' | 'PROTECTIVE_GEAR';
}

export const MATERIAL_PRODUCTS: Record<string, MaterialProduct[]> = {
  // Marbre (Marble)
  marble: [
    {
      name: "Cristallisant pour marbre",
      description: "Produit spécialisé pour la cristallisation du marbre",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Polish marbre",
      description: "Polish haute brillance pour surfaces en marbre",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Détergent neutre pH 7",
      description: "Nettoyant doux spécial marbre",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },

    {
      name: "Poudre de cristallisation",
      description: "Poudre pour lustrage haute brillance",
      unit: "kg",
      category: "CLEANING_PRODUCTS"
    }
  ],

  // Parquet (Wooden floors)
  parquet: [
    {
      name: "Vitrificateur parquet",
      description: "Protection haute résistance pour parquet",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Nettoyant spécial bois",
      description: "Détergent doux pour surfaces bois",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Huile d'entretien parquet",
      description: "Huile nourrissante pour bois",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Cire protectrice bois",
      description: "Cire de protection et brillance",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Rénovateur parquet",
      description: "Produit de rénovation pour bois usé",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }
  ],

  // Carrelage (Tiles)
  tiles: [
    {
      name: "Détergent dégraissant sols - Anti-calcaire sanitaires",
      description: "Nettoyant puissant pour carrelage",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }

  ],

  // Porcelaine (Porcelain)
  porcelain: [
    {
      name: "Nettoyant porcelaine premium",
      description: "Produit haute qualité pour porcelaine",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Protecteur brillance porcelaine",
      description: "Protection et brillance longue durée",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Détergent doux pH neutre",
      description: "Nettoyant sans risque pour porcelaine",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }
  ],

  // Bardage (Cladding/Siding)
  cladding: [
    {
      name: "Nettoyant façade haute pression",
      description: "Détergent pour nettoyeur haute pression",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Anti-mousse façade",
      description: "Traitement préventif et curatif",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Hydrofuge façade",
      description: "Protection imperméabilisante",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Dégrisant bois extérieur",
      description: "Rénovateur pour bardage bois",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }
  ],

  // Bois composite (Composite wood)
  composite_wood: [
    {
      name: "Nettoyant composite",
      description: "Produit spécifique bois composite",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Rénovateur composite",
      description: "Ravive les couleurs du composite",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Protecteur UV composite",
      description: "Protection contre les UV",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }
  ],

  // PVC
  pvc: [
    {
      name: "Nettoyant PVC",
      description: "Détergent spécial surfaces PVC",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Rénovateur PVC",
      description: "Redonne l'éclat au PVC jauni",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Dégraissant multi-surfaces",
      description: "Nettoyant polyvalent PVC",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }
  ],

  // Moquette (Carpet) - from existing materials
  carpet: [
    {
      name: "Shampoing moquette",
      description: "Nettoyant injection-extraction",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Détachant textile",
      description: "Enlève les taches tenaces",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Désodorisant textile",
      description: "Élimine les mauvaises odeurs",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }
  ],

  // Béton (Concrete)
  concrete: [
    {
      name: "Décapant béton",
      description: "Nettoyant puissant béton encrassé",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Durcisseur béton",
      description: "Traitement de surface béton",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    },
    {
      name: "Anti-poussière béton",
      description: "Traitement anti-poussière",
      unit: "L",
      category: "CLEANING_PRODUCTS"
    }
  ]
};

// Helper function to get products for multiple materials
export function getProductsForMaterials(materials: Record<string, boolean | string>): MaterialProduct[] {
  const products: MaterialProduct[] = [];
  const addedProducts = new Set<string>(); // Avoid duplicates

  Object.entries(materials).forEach(([material, value]) => {
    if (value && material !== 'other') {
      const materialProducts = MATERIAL_PRODUCTS[material] || [];
      materialProducts.forEach(product => {
        const key = `${product.name}-${product.category}`;
        if (!addedProducts.has(key)) {
          addedProducts.add(key);
          products.push(product);
        }
      });
    }
  });

  return products;
}

// Map lead material keys to our product keys
export function mapLeadMaterialsToProductKeys(leadMaterials: any): Record<string, boolean> {
  const materialMap: Record<string, boolean> = {};
  
  if (leadMaterials) {
    // Direct mappings
    if (leadMaterials.marble) materialMap.marble = true;
    if (leadMaterials.parquet) materialMap.parquet = true;
    if (leadMaterials.tiles) materialMap.tiles = true;
    if (leadMaterials.carpet) materialMap.carpet = true;
    if (leadMaterials.concrete) materialMap.concrete = true;
    
    // Check for additional materials in 'other' field
    if (leadMaterials.other && typeof leadMaterials.other === 'string') {
      const otherLower = leadMaterials.other.toLowerCase();
      if (otherLower.includes('porcelain')) materialMap.porcelain = true;
      if (otherLower.includes('bardage')) materialMap.cladding = true;
      if (otherLower.includes('composite')) materialMap.composite_wood = true;
      if (otherLower.includes('pvc')) materialMap.pvc = true;
    }
  }
  
  return materialMap;
}