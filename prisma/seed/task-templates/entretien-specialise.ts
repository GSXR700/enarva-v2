// prisma/seed/task-templates/entretien-specialise.ts
import { TaskCategory } from '@prisma/client';

type TemplateItem = { category: TaskCategory; title: string; };
type Template = { name: string; description: string; items: { create: TemplateItem[] }; };

export const entretienSpecialiseTemplates: Template[] = [
    {
        name: 'Visite Technique - Cristallisation Marbre',
        description: "Évaluation de l'état d'un sol en marbre avant traitement.",
        items: {
            create: [
                { category: 'FLOORS', title: 'Mesurer la surface exacte du marbre à traiter (en m²)' },
                { category: 'FLOORS', title: "Évaluer la porosité et l'état (rayures, taches, brillance)" },
                { category: 'FLOORS', title: 'Identifier le type de marbre pour le choix des produits' },
                { category: 'LOGISTICS_ACCESS', title: 'Vérifier si la zone peut être isolée pendant le traitement' },
                { category: 'LOGISTICS_ACCESS', title: "Confirmer l'accès à l'électricité pour la monobrosse" },
                { category: 'LIVING_SPACES', title: 'Noter la présence de meubles à déplacer' },
            ]
        }
    },
    {
        name: 'Opération - Cristallisation Marbre',
        description: "Processus d'exécution pour la cristallisation d'un sol en marbre.",
        items: {
            create: [
                { category: 'LIVING_SPACES', title: 'Déplacer et protéger le mobilier' },
                { category: 'WALLS_BASEBOARDS', title: 'Protéger les plinthes et les bas de murs' },
                { category: 'FLOORS', title: 'Décaper le sol avec une monobrosse et un disque adapté' },
                { category: 'FLOORS', title: "Rincer abondamment et aspirer l'eau résiduelle" },
                { category: 'FLOORS', title: 'Appliquer le produit de cristallisation par pulvérisation' },
                { category: 'FLOORS', title: "Polir avec la monobrosse et disque en laine d'acier" },
                { category: 'FLOORS', title: 'Dépoussiérer la surface avec un balai trapèze' },
                { category: 'LIVING_SPACES', title: 'Replacer le mobilier' },
            ]
        }
    },
];