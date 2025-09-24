// prisma/seed/task-templates/bureaux.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = {
  category: TaskCategory;
  title: string;
};

type Template = {
  name: string;
  description: string;
  items: {
    create: TemplateItem[];
  };
};

export const bureauxTemplates: Template[] = [
  {
    name: 'Opération - Entretien Régulier Bureaux',
    description: "Checklist pour le nettoyage et l'entretien courant des espaces de bureau.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: 'Vider les poubelles et remplacer les sacs' },
        { category: TaskCategory.LIVING_SPACES, title: 'Dépoussiérer les bureaux, étagères et surfaces de travail' },
        { category: TaskCategory.FLOORS, title: 'Aspirer les moquettes et les sols durs' },
        { category: TaskCategory.FLOORS, title: 'Laver les sols durs avec un produit neutre' },
        { category: TaskCategory.KITCHEN, title: "Nettoyer et désinfecter l'espace cuisine/café (micro-ondes, évier)" },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Nettoyer et désinfecter les sanitaires et les lavabos' },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Réapprovisionner en papier toilette, savon et essuie-mains' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyer les traces de doigts sur les portes et les vitres intérieures' },
      ],
    },
  },
  {
    name: 'Opération - Grand Ménage Bureaux',
    description: 'Nettoyage en profondeur des espaces de bureau avec désinfection complète.',
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: 'Déplacer les meubles légers pour nettoyage en profondeur' },
        { category: TaskCategory.LIVING_SPACES, title: 'Dépoussiérer et nettoyer toutes les surfaces de travail' },
        { category: TaskCategory.LIVING_SPACES, title: 'Nettoyer et désinfecter les équipements informatiques (écrans, claviers)' },
        { category: TaskCategory.FLOORS, title: 'Aspiration minutieuse de tous les recoins et angles' },
        { category: TaskCategory.FLOORS, title: 'Lavage et désinfection complète des sols' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyage complet des vitres intérieures et extérieures' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyage des encadrements et rebords de fenêtres' },
        { category: TaskCategory.WALLS_BASEBOARDS, title: 'Nettoyage des murs, plinthes et interrupteurs' },
        { category: TaskCategory.KITCHEN, title: "Dégraissage complet de l'espace cuisine/café" },
        { category: TaskCategory.KITCHEN, title: 'Nettoyage intérieur/extérieur des appareils électroménagers' },
        { category: TaskCategory.BATHROOM_SANITARY, title: 'Détartrage complet des sanitaires et robinetterie' },
        { category: TaskCategory.BATHROOM_SANITARY, title: "Désinfection totale de l'espace sanitaire" },
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Vérification et nettoyage des systèmes de ventilation' },
      ],
    },
  },
];