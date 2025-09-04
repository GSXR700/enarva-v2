// prisma/seed/task-templates/mobilier-textile.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = { category: TaskCategory; title: string; };
type Template = { name: string; description: string; items: { create: TemplateItem[] }; };

export const mobilierTextileTemplates: Template[] = [
  {
    name: 'Visite Technique - Nettoyage Canapé Tissu',
    description: "Inspection d'un canapé avant nettoyage par injection-extraction.",
    items: {
      create: [
        { category: 'LIVING_SPACES', title: 'Identifier le type de tissu (microfibre, coton, velours, etc.)' },
        { category: 'LIVING_SPACES', title: 'Noter le nombre de places du canapé (3 places, angle, etc.)' },
        { category: 'LIVING_SPACES', title: 'Identifier la nature des taches (alimentaire, encre, graisse)' },
        { category: 'LIVING_SPACES', title: "Vérifier la présence d'odeurs (animaux, humidité)" },
        { category: 'LOGISTICS_ACCESS', title: "S'assurer de la présence d'une prise électrique à proximité" },
      ]
    }
  },
  {
    name: 'Opération - Nettoyage Canapé Tissu',
    description: "Processus de nettoyage d'un canapé par injection-extraction.",
    items: {
      create: [
        { category: 'LOGISTICS_ACCESS', title: 'Protéger le sol autour du canapé' },
        { category: 'LIVING_SPACES', title: 'Aspirer en profondeur toute la surface du canapé' },
        { category: 'LIVING_SPACES', title: 'Appliquer un détachant spécifique sur les taches tenaces' },
        { category: 'LIVING_SPACES', title: 'Procéder au nettoyage par injection-extraction' },
        { category: 'LIVING_SPACES', title: "Répéter l'extraction avec de l'eau claire pour rincer" },
        { category: 'LIVING_SPACES', title: 'Brosser les fibres pour un séchage uniforme' },
        { category: 'LIVING_SPACES', title: 'Informer le client sur le temps de séchage (4-6h)' },
      ]
    }
  },
];