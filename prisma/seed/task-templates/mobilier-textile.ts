// prisma/seed/task-templates/mobilier-textile.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = { category: TaskCategory; title: string; };
type Template = { name: string; description: string; items: { create: TemplateItem[] }; };

export const mobilierTextileTemplates: Template[] = [
  {
    name: 'Visite Technique - Nettoyage Canapé Tissu',
    description: "Évaluation préliminaire pour le nettoyage d'un canapé en tissu.",
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: 'Identifier le type de tissu (coton, lin, microfibre, etc.)' },
        { category: TaskCategory.LIVING_SPACES, title: "Vérifier l'étiquette d'entretien du fabricant" },
        { category: TaskCategory.LIVING_SPACES, title: 'Tester la solidité des couleurs sur une zone cachée' },
        { category: TaskCategory.LIVING_SPACES, title: 'Identifier la nature des taches (alimentaire, encre, graisse)' },
        { category: TaskCategory.LIVING_SPACES, title: "Vérifier la présence d'odeurs (animaux, humidité)" },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "S'assurer de la présence d'une prise électrique à proximité" },
      ]
    }
  },
  {
    name: 'Opération - Nettoyage Canapé Tissu',
    description: "Processus de nettoyage d'un canapé par injection-extraction.",
    items: {
      create: [
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Protéger le sol autour du canapé' },
        { category: TaskCategory.LIVING_SPACES, title: 'Aspirer en profondeur toute la surface du canapé' },
        { category: TaskCategory.LIVING_SPACES, title: 'Appliquer un détachant spécifique sur les taches tenaces' },
        { category: TaskCategory.LIVING_SPACES, title: 'Procéder au nettoyage par injection-extraction' },
        { category: TaskCategory.LIVING_SPACES, title: "Répéter l'extraction avec de l'eau claire pour rincer" },
        { category: TaskCategory.LIVING_SPACES, title: 'Brosser les fibres pour un séchage uniforme' },
        { category: TaskCategory.LIVING_SPACES, title: 'Informer le client sur le temps de séchage (4-6h)' },
      ]
    }
  },
  {
    name: 'Opération - Nettoyage Matelas',
    description: 'Nettoyage et désinfection en profondeur de matelas.',
    items: {
      create: [
        { category: TaskCategory.LIVING_SPACES, title: 'Aspirer les deux faces du matelas' },
        { category: TaskCategory.LIVING_SPACES, title: 'Traiter les taches spécifiques (sang, urine, etc.)' },
        { category: TaskCategory.LIVING_SPACES, title: 'Appliquer un traitement anti-acariens' },
        { category: TaskCategory.LIVING_SPACES, title: 'Procéder au nettoyage par injection-extraction' },
        { category: TaskCategory.LIVING_SPACES, title: 'Assurer une ventilation adéquate pour le séchage' },
      ]
    }
  },
  {
    name: 'Opération - Nettoyage Tapis & Moquette',
    description: 'Nettoyage de tapis et moquettes par injection-extraction.',
    items: {
      create: [
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Dégager la zone et déplacer les meubles' },
        { category: TaskCategory.FLOORS, title: 'Aspirer la surface en profondeur' },
        { category: TaskCategory.FLOORS, title: 'Prétraiter les zones de fort passage et les taches' },
        { category: TaskCategory.FLOORS, title: 'Nettoyer par injection-extraction' },
        { category: TaskCategory.FLOORS, title: 'Extraire un maximum d\'humidité' },
        { category: TaskCategory.FLOORS, title: 'Protéger les pieds des meubles au moment de les replacer' },
      ]
    }
  }
];