// prisma/seed/task-templates/entretien-specialise.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = { category: TaskCategory; title: string; };
type Template = { name: string; description: string; items: { create: TemplateItem[] }; };

export const entretienSpecialiseTemplates: Template[] = [
  {
    name: 'Opération - Cristallisation Marbre',
    description: 'Processus de cristallisation et lustrage des surfaces en marbre.',
    items: {
      create: [
        { category: TaskCategory.FLOORS, title: 'Nettoyer la surface avec un produit neutre' },
        { category: TaskCategory.FLOORS, title: 'Sécher complètement la surface' },
        { category: TaskCategory.FLOORS, title: 'Appliquer le cristallisant avec la mono-brosse' },
        { category: TaskCategory.FLOORS, title: 'Travailler par sections de 2-3 m²' },
        { category: TaskCategory.FLOORS, title: 'Polir avec des disques en acier' },
        { category: TaskCategory.FLOORS, title: 'Aspirer les résidus de poudre' },
        { category: TaskCategory.FLOORS, title: "Contrôler la brillance et l'uniformité" },
        { category: TaskCategory.FLOORS, title: 'Appliquer un produit de protection si nécessaire' },
      ]
    }
  },
  {
    name: 'Opération - Nettoyage Vitres Hauteur',
    description: 'Protocole de sécurité et nettoyage pour vitres en hauteur.',
    items: {
      create: [
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Vérifier et sécuriser l'équipement de protection" },
        { category: TaskCategory.LOGISTICS_ACCESS, title: "Installer les échafaudages ou systèmes d'accès" },
        { category: TaskCategory.WINDOWS_JOINERY, title: "Inspecter l'état des vitres et châssis" },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Mouiller avec la solution nettoyante' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyer avec la raclette de bas en haut' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Sécher les bords avec un chiffon microfibre' },
        { category: TaskCategory.WINDOWS_JOINERY, title: "Contrôler l'absence de traces" },
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Ranger et sécuriser le matériel' },
      ]
    }
  },
  {
    name: 'Opération - Nettoyage Façade Haute Pression',
    description: 'Nettoyage de façades en pierre ou crépi avec un nettoyeur haute pression.',
    items: {
      create: [
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Installer le périmètre de sécurité' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Protéger les fenêtres, portes et plantations' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Appliquer un produit anti-mousse si nécessaire et laisser agir' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Nettoyer la façade de haut en bas avec la lance' },
        { category: TaskCategory.EXTERIOR_FACADE, title: 'Rincer abondamment à pression modérée' },
        { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyer les éclaboussures sur les vitres' },
        { category: TaskCategory.LOGISTICS_ACCESS, title: 'Démonter et ranger le matériel' },
      ]
    }
  }
];