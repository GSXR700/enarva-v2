// prisma/seed/task-templates/residentiel.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = {
  category: TaskCategory;
  title: string;
};

type Template = {
  name: string;
  description: string;
  items: { create: TemplateItem[] };
};

export const residentielTemplates: Template[] = [
  // --- Appartement Moyen ---
  {
    name: 'Visite Technique - Grand Ménage (Appartement Moyen)',
    description:
      "Checklist d'inspection pour préparer un grand ménage dans un appartement de taille moyenne.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: "Évaluer l'état général des pièces (poussière, encombrement)" },
        { category: TaskCategory.LIVING_SPACES, title: 'Vérifier la présence de meubles lourds ou fragiles à déplacer' },
        { category: TaskCategory.KITCHEN, title: "Inspection de l'état des surfaces (graisse, calcaire, taches)" },
        { category: TaskCategory.BATHROOM_SANITARY, title: "Évaluer l'état des sanitaires (calcaire, moisissures)" },
        { category: TaskCategory.FLOORS, title: 'Identifier le type de sol (carrelage, parquet, marbre)' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Vérifier accumulation de poussière/taches sur vitres et cadres' },
        { category: TaskCategory.WALLS_BASEBOARDS, title: 'Noter la présence de traces sur murs et plinthes' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Confirmer l'accès à l'eau et électricité pour le matériel" }
      ]
    }
  },
  {
    name: 'Opération - Grand Ménage (Appartement Moyen)',
    description:
      "Plan d'exécution détaillé pour un grand ménage dans un appartement de taille moyenne.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: 'Dépoussiérage complet des meubles, luminaires et décorations' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyage intérieur/extérieur des vitres et cadres' },
        { category: TaskCategory.WALLS_BASEBOARDS, title: 'Nettoyage humide des plinthes et effacement des traces murales' },
        { category: TaskCategory.FLOORS, title: 'Aspiration complète de toutes les pièces' },
        { category: TaskCategory.FLOORS, title: 'Lavage humide du sol adapté au type de revêtement' },
        { category: TaskCategory.KITCHEN, title: 'Dégraissage et désinfection du plan de travail et crédence' },
        { category: TaskCategory.KITCHEN, title: 'Nettoyage intérieur/extérieur des placards et électroménagers' },
        { category: TaskCategory.KITCHEN, title: "Détartrage de l'évier et robinetterie" },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Détartrage et désinfection WC, douche/baignoire, lavabo' },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Nettoyage des miroirs et accessoires' },
        { category: TaskCategory.LIVING_SPACES, title: 'Changer les draps et aérer toutes les pièces' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Évacuer les déchets et sacs aspirateur après le ménage' }
      ]
    }
  },

  // --- Appartement Grand / Duplex ---
  {
    name: 'Visite Technique - Grand Ménage (Appartement Grand / Duplex)',
    description:
      "Checklist d'inspection pour préparer un grand ménage dans un grand appartement ou duplex.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: "Évaluer l'état général des pièces de vie et chambres" },
        { category: TaskCategory.STAIRS, title: 'Inspecter état des escaliers (matériaux, saleté)' },
        { category: TaskCategory.FLOORS, title: 'Identifier les différents types de sols (parquet, marbre, carrelage, moquette)' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Inspection des vitres hautes et baies vitrées' },
        { category: TaskCategory.KITCHEN, title: "Évaluer l'état de la cuisine (graisse, calcaire, électroménager)" },
        { category: TaskCategory.BATHROOM_SANITARY, title: "Vérifier l'état des différentes salles de bains et WC" },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Inspection des balcons/terrasses (sols, garde-corps, vitres)' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Confirmer l'accès à l'eau, électricité et ascenseur/escaliers" }
      ]
    }
  },
  {
    name: 'Opération - Grand Ménage (Appartement Grand / Duplex)',
    description:
      "Plan d'exécution détaillé pour un grand ménage dans un grand appartement ou duplex.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: 'Dépoussiérage minutieux de tout le mobilier et décorations' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Lavage complet des baies vitrées, fenêtres hautes et cadres' },
        { category: TaskCategory.WALLS_BASEBOARDS, title: 'Nettoyage humide des plinthes et suppression des traces murales' },
        { category: TaskCategory.FLOORS, title: 'Aspiration et lavage humide de tous les sols selon revêtement' },
        { category: TaskCategory.STAIRS, title: 'Nettoyage complet des escaliers (marches, rampes, plinthes)' },
        { category: TaskCategory.KITCHEN, title: 'Dégraissage et désinfection des plans de travail, crédences et placards' },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Détartrage et désinfection des sanitaires, lavabos, douches et baignoires' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Balayage, lavage et désinfection des balcons et terrasses' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Évacuation des déchets, sacs aspirateur et produits usagés" }
      ]
    }
  },

  // --- Villa Luxe ---
  {
    name: 'Visite Technique - Grand Ménage (Villa Luxe)',
    description: "Checklist d'inspection pour un grand ménage dans une villa de luxe.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: "Évaluer l'état général des salons, chambres et salles à manger" },
        { category: TaskCategory.FLOORS, title: 'Identifier types de sols : marbre, parquet, carrelage, tapis' },
        { category: TaskCategory.STAIRS, title: "Inspection des escaliers intérieurs et extérieurs" },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Inspection des vitres panoramiques et baies vitrées' },
        { category: TaskCategory.KITCHEN, title: "Vérifier l'état des cuisines principale et secondaire" },
        { category: TaskCategory.BATHROOM_SANITARY, title: "Contrôler l'état de toutes les salles de bains" },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Inspection des terrasses, balcons et vérandas' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Vérifier la présence de piscine, jardin, garage' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Noter accès eau, électricité et stockage matériel" }
      ]
    }
  },
  {
    name: 'Opération - Grand Ménage (Villa Luxe)',
    description: "Plan d'exécution détaillé pour un grand ménage dans une villa de luxe.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: 'Dépoussiérage complet du mobilier et décorations' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Lavage complet des baies vitrées et fenêtres panoramiques' },
        { category: TaskCategory.WALLS_BASEBOARDS, title: 'Nettoyage humide des plinthes et murs (traces visibles)' },
        { category: TaskCategory.FLOORS, title: 'Aspiration et lavage complet de tous les sols' },
        { category: TaskCategory.FLOORS, title: 'Cristallisation / traitement spécial pour le marbre' },
        { category: TaskCategory.STAIRS, title: 'Nettoyage des escaliers intérieurs et extérieurs' },
        { category: TaskCategory.KITCHEN, title: 'Nettoyage complet des placards, plan de travail et électroménagers' },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Détartrage et désinfection de toutes les salles de bains' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Nettoyage terrasses, balcons, garde-corps' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Nettoyage margelles et abords de piscine' },
        { category: TaskCategory.LIVING_SPACES, title: 'Changement du linge de maison et réorganisation des espaces' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Évacuation des déchets et sacs d'aspirateur" }
      ]
    }
  }
];