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
        { category: 'FLOORS', title: 'Nettoyer la surface avec un produit neutre' },
        { category: 'FLOORS', title: 'Sécher complètement la surface' },
        { category: 'FLOORS', title: 'Appliquer le cristallisant avec la mono-brosse' },
        { category: 'FLOORS', title: 'Travailler par sections de 2-3 m²' },
        { category: 'FLOORS', title: 'Polir avec des disques en acier' },
        { category: 'FLOORS', title: 'Aspirer les résidus de poudre' },
        { category: 'FLOORS', title: 'Contrôler la brillance et l\'uniformité' },
        { category: 'FLOORS', title: 'Appliquer un produit de protection si nécessaire' },
      ]
    }
  },
  {
    name: 'Opération - Nettoyage Vitres Hauteur',
    description: 'Protocole de sécurité et nettoyage pour vitres en hauteur.',
    items: {
      create: [
        { category: 'LOGISTICS_ACCESS', title: 'Vérifier et sécuriser l\'équipement de protection' },
        { category: 'LOGISTICS_ACCESS', title: 'Installer les échafaudages ou systèmes d\'accès' },
        { category: 'WINDOWS_JOINERY', title: 'Inspecter l\'état des vitres et châssis' },
        { category: 'WINDOWS_JOINERY', title: 'Mouiller avec la solution nettoyante' },
        { category: 'WINDOWS_JOINERY', title: 'Nettoyer avec la raclette de bas en haut' },
        { category: 'WINDOWS_JOINERY', title: 'Sécher les bords avec un chiffon microfibre' },
        { category: 'WINDOWS_JOINERY', title: 'Contrôler l\'absence de traces' },
        { category: 'LOGISTICS_ACCESS', title: 'Ranger et sécuriser le matériel' },
      ]
    }
  }
];