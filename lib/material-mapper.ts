// lib/material-mapper.ts
export function mapLeadMaterialsToProductKeys(materials: any): Record<string, boolean | string> {
  if (!materials) return {};
  
  if (typeof materials === 'string') {
    try {
      return JSON.parse(materials);
    } catch {
      return {};
    }
  }
  
  return materials;
}

export function getProductsForMaterials(materials: Record<string, boolean | string>): Array<{ name: string; description?: string }> {
  const products: Array<{ name: string; description?: string }> = [];
  
  // Support des clés EN ANGLAIS (Prisma) ET EN FRANÇAIS
  const materialProductMap: Record<string, { name: string; description: string }> = {
    // Clés en anglais (Prisma)
    marble: { name: 'Nettoyant pour marbre', description: 'Spécial surfaces en marbre' },
    granite: { name: 'Nettoyant pour granit', description: 'Protection et brillance du granit' },
    wood: { name: 'Nettoyant pour bois', description: 'Entretien des surfaces en bois' },
    parquet: { name: 'Produit spécial bois', description: 'Entretien parquet' },
    tiles: { name: 'Nettoyant pour carrelage', description: 'Dégraissant pour carrelage' },
    glass: { name: 'Nettoyant vitres', description: 'Sans traces pour vitres et miroirs' },
    stainless: { name: 'Nettoyant inox', description: 'Brillance et protection de l\'inox' },
    plastic: { name: 'Nettoyant multi-surfaces', description: 'Pour surfaces plastiques' },
    fabric: { name: 'Détachant textile', description: 'Nettoyage en profondeur des tissus' },
    leather: { name: 'Nettoyant pour cuir', description: 'Entretien et nutrition du cuir' },
    carpet: { name: 'Shampoing pour tapis', description: 'Nettoyage en profondeur des tapis' },
    
    // Clés en français (compatibilité)
    marbre: { name: 'Nettoyant pour marbre', description: 'Spécial surfaces en marbre' },
    granit: { name: 'Nettoyant pour granit', description: 'Protection et brillance du granit' },
    bois: { name: 'Nettoyant pour bois', description: 'Entretien des surfaces en bois' },
    carrelage: { name: 'Nettoyant pour carrelage', description: 'Dégraissant pour carrelage' },
    verre: { name: 'Nettoyant vitres', description: 'Sans traces pour vitres et miroirs' },
    inox: { name: 'Nettoyant inox', description: 'Brillance et protection de l\'inox' },
    plastique: { name: 'Nettoyant multi-surfaces', description: 'Pour surfaces plastiques' },
    tissu: { name: 'Détachant textile', description: 'Nettoyage en profondeur des tissus' },
    cuir: { name: 'Nettoyant pour cuir', description: 'Entretien et nutrition du cuir' },
    tapis: { name: 'Shampoing pour tapis', description: 'Nettoyage en profondeur des tapis' }
  };
  
  Object.entries(materials).forEach(([key, value]) => {
    if (value && key !== 'other' && materialProductMap[key]) {
      products.push(materialProductMap[key]);
    }
  });
  
  return products;
}