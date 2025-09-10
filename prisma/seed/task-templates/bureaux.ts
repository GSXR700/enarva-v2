// prisma/seed/task-templates/bureaux.ts
import { TaskCategory } from '@prisma/client';

// ✅ Fix: Simplified type structure to match what the seed expects
type TemplateItem = { 
  category: TaskCategory; 
  title: string; 
};

type Template = { 
  name: string; 
  description: string; 
  items: { 
    create: TemplateItem[] 
  }; 
};

export const bureauxTemplates: Template[] = [
  {
    name: 'Opération - Entretien Régulier Bureaux',
    description: 'Checklist pour le nettoyage et l\'entretien courant des espaces de bureau.',
    items: {
      create: [
        { category: 'LIVING_SPACES', title: 'Vider les poubelles et remplacer les sacs' },
        { category: 'LIVING_SPACES', title: 'Dépoussiérer les bureaux, étagères et surfaces de travail' },
        { category: 'FLOORS', title: 'Aspirer les moquettes et les sols durs' },
        { category: 'FLOORS', title: 'Laver les sols durs avec un produit neutre' },
        { category: 'KITCHEN', title: 'Nettoyer et désinfecter l\'espace cuisine/café (micro-ondes, évier)' },
        { category: 'BATHROOM_SANITARY', title: 'Nettoyer et désinfecter les sanitaires et les lavabos' },
        { category: 'BATHROOM_SANITARY', title: 'Réapprovisionner en papier toilette, savon et essuie-mains' },
        { category: 'WINDOWS_JOINERY', title: 'Nettoyer les traces de doigts sur les portes et les vitres intérieures' },
      ],
    },
  },
  {
    name: 'Opération - Grand Ménage Bureaux',
    description: 'Nettoyage en profondeur des espaces de bureau avec désinfection complète.',
    items: {
      create: [
        { category: 'LIVING_SPACES', title: 'Déplacer les meubles légers pour nettoyage en profondeur' },
        { category: 'LIVING_SPACES', title: 'Dépoussiérer et nettoyer toutes les surfaces de travail' },
        { category: 'LIVING_SPACES', title: 'Nettoyer et désinfecter les équipements informatiques (écrans, claviers)' },
        { category: 'FLOORS', title: 'Aspiration minutieuse de tous les recoins et angles' },
        { category: 'FLOORS', title: 'Lavage et désinfection complète des sols' },
        { category: 'WINDOWS_JOINERY', title: 'Nettoyage complet des vitres intérieures et extérieures' },
        { category: 'WINDOWS_JOINERY', title: 'Nettoyage des encadrements et rebords de fenêtres' },
        { category: 'WALLS_BASEBOARDS', title: 'Nettoyage des murs, plinthes et interrupteurs' },
        { category: 'KITCHEN', title: 'Dégraissage complet de l\'espace cuisine/café' },
        { category: 'KITCHEN', title: 'Nettoyage intérieur/extérieur des appareils électroménagers' },
        { category: 'BATHROOM_SANITARY', title: 'Détartrage complet des sanitaires et robinetterie' },
        { category: 'BATHROOM_SANITARY', title: 'Désinfection totale de l\'espace sanitaire' },
        { category: 'LOGISTICS_ACCESS', title: 'Vérification et nettoyage des systèmes de ventilation' },
      ],
    },
  },
];