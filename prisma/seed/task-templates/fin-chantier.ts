// prisma/seed/task-templates/fin-chantier.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = { category: TaskCategory; title: string; };
type Template = { name: string; description: string; items: { create: TemplateItem[] }; };

export const finChantierTemplates: Template[] = [
  {
    name: 'Visite Technique - Fin de Chantier (Villa Luxe)',
    description: "Checklist d'évaluation pour un nettoyage complet post-construction dans une villa de haut standing.",
    items: {
      create: [
        { category: TaskCategory.EXTERIOR_FACADE, title: 'État général des façades (pierre, crépi, etc.)' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Présence de taches de peinture, ciment, poussière' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'État des vitres extérieures et cadres' },
        { category: TaskCategory.FLOORS, title: 'Inspection du Marbre (rayures, taches, besoin de cristallisation ?)' },
        { category: TaskCategory.FLOORS, title: 'Inspection du Parquet (humidité, traces)' },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Vérification des joints et traces de calcaire' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Noter les points d'accès à l'eau et électricité" },
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Estimer le volume des gravats et déchets de chantier à évacuer' },
      ]
    }
  },
  {
    name: 'Opération - Fin de Chantier (Villa Luxe)',
    description: "Plan d'action détaillé pour l'exécution du nettoyage fin de chantier.",
    items: {
      create: [
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Préparer et sécuriser la zone de travail' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Évacuer les gros déchets et gravats' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Nettoyer les façades avec produits spécialisés' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyer vitres extérieures et châssis' },
        { category: TaskCategory.FLOORS, title: 'Dépoussiérage intensif de tous les sols' },
        { category: TaskCategory.FLOORS, title: 'Traitement spécialisé du marbre (cristallisation si nécessaire)' },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Détartrage complet des sanitaires neufs' },
        { category: TaskCategory.KITCHEN, title: 'Nettoyage approfondi de la cuisine neuve' },
        { category: TaskCategory.WALLS_BASEBOARDS, title: 'Nettoyage des murs, plinthes et interrupteurs' },
        { category: TaskCategory.LIVING_SPACES, title: 'Nettoyage final et inspection qualité' },
      ]
    }
  }
];