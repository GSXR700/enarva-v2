// prisma/seed/task-templates/bureaux.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = { category: TaskCategory; title: string; };
type Template = { name: string; description: string; items: { create: TemplateItem[] }; };

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
];