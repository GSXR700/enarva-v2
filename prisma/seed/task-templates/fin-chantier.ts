// prisma/seed/task-templates/fin-chantier.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = { category: TaskCategory; title: string; };
type Template = { name: string; description: string; items: { create: TemplateItem[] }; };

export const finChantierTemplates: Template[] = [
  {
    name: 'Visite Technique - Fin de Chantier (Villa Luxe)',
    description: 'Checklist d\'évaluation pour un nettoyage complet post-construction dans une villa de haut standing.',
    items: {
      create: [
        { category: 'EXTERIOR_FACADE', title: 'État général des façades (pierre, crépi, etc.)' },
        { category: 'EXTERIOR_FACADE', title: 'Présence de taches de peinture, ciment, poussière' },
        { category: 'WINDOWS_JOINERY', title: 'État des vitres extérieures et cadres' },
        { category: 'FLOORS', title: 'Inspection du Marbre (rayures, taches, besoin de cristallisation ?)' },
        { category: 'FLOORS', title: 'Inspection du Parquet (humidité, traces)' },
        { category: 'BATHROOM_SANITARY', title: 'Vérification des joints et traces de calcaire' },
        { category: 'LOGISTICS_ACCESS', title: 'Noter les points d\'accès à l\'eau et électricité' },
        { category: 'LOGISTICS_ACCESS', title: 'Estimer le volume des gravats et déchets de chantier à évacuer' },
      ]
    }
  },
  {
    name: 'Opération - Fin de Chantier (Villa Luxe)',
    description: 'Plan d\'action détaillé pour l\'exécution du nettoyage fin de chantier.',
    items: {
      create: [
        { category: 'LOGISTICS_ACCESS', title: 'Préparer et sécuriser la zone de travail' },
        { category: 'LOGISTICS_ACCESS', title: 'Évacuer les gros déchets et gravats' },
        { category: 'EXTERIOR_FACADE', title: 'Nettoyer les façades avec produits spécialisés' },
        { category: 'WINDOWS_JOINERY', title: 'Nettoyer vitres extérieures et châssis' },
        { category: 'FLOORS', title: 'Dépoussiérage intensif de tous les sols' },
        { category: 'FLOORS', title: 'Traitement spécialisé du marbre (cristallisation si nécessaire)' },
        { category: 'BATHROOM_SANITARY', title: 'Détartrage complet des sanitaires neufs' },
        { category: 'KITCHEN', title: 'Nettoyage approfondi de la cuisine neuve' },
        { category: 'WALLS_BASEBOARDS', title: 'Nettoyage des murs, plinthes et interrupteurs' },
        { category: 'LIVING_SPACES', title: 'Nettoyage final et inspection qualité' },
      ]
    }
  }
];