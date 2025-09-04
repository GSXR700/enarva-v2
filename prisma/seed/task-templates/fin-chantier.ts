// prisma/seed/task-templates/fin-chantier.ts
import { TaskCategory } from '@prisma/client';

// Define the structure for a template item, ensuring type safety
type TemplateItem = {
    category: TaskCategory;
    title: string;
};

// Define the structure for a full template
type Template = {
    name: string;
    description: string;
    items: { create: TemplateItem[] };
};

// This is the array of all your detailed checklist templates
export const finChantierTemplates: Template[] = [
    // --- TEMPLATES FOR: Nettoyage Fin de Chantier ---
    {
        name: 'Visite Technique - Fin de Chantier (Villa Luxe)',
        description: 'Checklist d\'évaluation pour un nettoyage complet post-construction dans une villa de haut standing.',
        items: {
            create: [
                { category: 'EXTERIOR_FACADE', title: 'État général des façades (pierre, crépi, etc.)' },
                { category: 'EXTERIOR_FACADE', title: 'Présence de taches de peinture, ciment, poussière' },
                { category: 'WINDOWS_JOINERY', title: 'État des vitres extérieures et cadres' },
                { category: 'FLOORS', title: 'Inspection du Marbre (rayures, taches, besoin de cristallisation ?)' },
                { category: 'STAIRS', title: "Vérifier la présence de résidus de construction sur les escaliers" },
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
                { category: 'LOGISTICS_ACCESS', title: 'Protéger les surfaces fragiles (prises, interrupteurs)' },
                { category: 'EXTERIOR_FACADE', title: 'Grattage et nettoyage des taches sur les façades' },
                { category: 'WINDOWS_JOINERY', title: 'Nettoyage complet des vitres, cadres et rails' },
                { category: 'WALLS_BASEBOARDS', title: 'Dépoussiérage et nettoyage humide des murs et plinthes' },
                { category: 'FLOORS', title: 'Aspiration industrielle de toutes les surfaces' },
                { category: 'STAIRS', title: 'Grattage et nettoyage des résidus de chantier sur les escaliers' },
                { category: 'FLOORS', title: 'Décapage et lavage du carrelage (retrait voile de ciment)' },
                { category: 'FLOORS', title: 'Traitement spécifique du marbre (selon devis)' },
                { category: 'KITCHEN', title: 'Nettoyage et désinfection intérieur/extérieur des placards' },
                { category: 'BATHROOM_SANITARY', title: 'Détartrage et désinfection des sanitaires et douches' },
                { category: 'LIVING_SPACES', title: 'Nettoyage des poignées, interrupteurs et luminaires' },
                { category: 'LOGISTICS_ACCESS', title: 'Évacuation de tous les déchets de chantier' },
            ]
        }
    },
];