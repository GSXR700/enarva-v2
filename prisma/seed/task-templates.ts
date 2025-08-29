// prisma/seed/task-templates.ts
import { PrismaClient, TaskCategory } from '@prisma/client';

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
const templates: Template[] = [
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
                { category: 'FLOORS', title: 'Décapage et lavage du carrelage (retrait voile de ciment)' },
                { category: 'FLOORS', title: 'Traitement spécifique du marbre (selon devis)' },
                { category: 'KITCHEN', title: 'Nettoyage et désinfection intérieur/extérieur des placards' },
                { category: 'BATHROOM_SANITARY', title: 'Détartrage et désinfection des sanitaires et douches' },
                { category: 'LIVING_SPACES', title: 'Nettoyage des poignées, interrupteurs et luminaires' },
                { category: 'LOGISTICS_ACCESS', title: 'Évacuation de tous les déchets de chantier' },
            ]
        }
    },
    // --- TEMPLATES FOR: Traitement des Sols ---
    {
        name: 'Visite Technique - Cristallisation Marbre',
        description: 'Évaluation de l\'état d\'un sol en marbre avant traitement.',
        items: {
            create: [
                { category: 'FLOORS', title: 'Mesurer la surface exacte du marbre à traiter (en m²)' },
                { category: 'FLOORS', title: 'Évaluer la porosité et l\'état (rayures, taches, brillance)' },
                { category: 'FLOORS', title: 'Identifier le type de marbre pour le choix des produits' },
                { category: 'LOGISTICS_ACCESS', title: 'Vérifier si la zone peut être isolée pendant le traitement' },
                { category: 'LOGISTICS_ACCESS', title: 'Confirmer l\'accès à l\'électricité pour la monobrosse' },
                { category: 'LIVING_SPACES', title: 'Noter la présence de meubles à déplacer' },
            ]
        }
    },
    {
        name: 'Opération - Cristallisation Marbre',
        description: 'Processus d\'exécution pour la cristallisation d\'un sol en marbre.',
        items: {
            create: [
                { category: 'LIVING_SPACES', title: 'Déplacer et protéger le mobilier' },
                { category: 'WALLS_BASEBOARDS', title: 'Protéger les plinthes et les bas de murs' },
                { category: 'FLOORS', title: 'Décaper le sol avec une monobrosse et un disque adapté' },
                { category: 'FLOORS', title: 'Rincer abondamment et aspirer l\'eau résiduelle' },
                { category: 'FLOORS', title: 'Appliquer le produit de cristallisation par pulvérisation' },
                { category: 'FLOORS', title: 'Polir avec la monobrosse et disque en laine d\'acier' },
                { category: 'FLOORS', title: 'Dépoussiérer la surface avec un balai trapèze' },
                { category: 'LIVING_SPACES', title: 'Replacer le mobilier' },
            ]
        }
    },
    // --- TEMPLATES FOR: Nettoyage des Canapés & Tapis ---
    {
        name: 'Visite Technique - Nettoyage Canapé Tissu',
        description: 'Inspection d\'un canapé avant nettoyage par injection-extraction.',
        items: {
            create: [
                { category: 'LIVING_SPACES', title: 'Identifier le type de tissu (microfibre, coton, velours, etc.)' },
                { category: 'LIVING_SPACES', title: 'Noter le nombre de places du canapé (3 places, angle, etc.)' },
                { category: 'LIVING_SPACES', title: 'Identifier la nature des taches (alimentaire, encre, graisse)' },
                { category: 'LIVING_SPACES', title: 'Vérifier la présence d\'odeurs (animaux, humidité)' },
                { category: 'LOGISTICS_ACCESS', title: 'S\'assurer de la présence d\'une prise électrique à proximité' },
            ]
        }
    },
    {
        name: 'Opération - Nettoyage Canapé Tissu',
        description: 'Processus de nettoyage d\'un canapé par injection-extraction.',
        items: {
            create: [
                { category: 'LOGISTICS_ACCESS', title: 'Protéger le sol autour du canapé' },
                { category: 'LIVING_SPACES', title: 'Aspirer en profondeur toute la surface du canapé' },
                { category: 'LIVING_SPACES', title: 'Appliquer un détachant spécifique sur les taches tenaces' },
                { category: 'LIVING_SPACES', title: 'Procéder au nettoyage par injection-extraction' },
                { category: 'LIVING_SPACES', title: 'Répéter l\'extraction avec de l\'eau claire pour rincer' },
                { category: 'LIVING_SPACES', title: 'Brosser les fibres pour un séchage uniforme' },
                { category: 'LIVING_SPACES', title: 'Informer le client sur le temps de séchage (4-6h)' },
            ]
        }
    },
];

export async function seedTaskTemplates(prisma: PrismaClient) {
    console.log('Seeding task templates...');
    // Use a transaction to ensure all templates are created or none are
    await prisma.$transaction(async (tx) => {
        for (const template of templates) {
            await tx.taskTemplate.upsert({
                where: { name: template.name },
                update: {}, // Do nothing if it exists
                create: template,
            });
        }
    });
    console.log(`Seeding finished. ${templates.length} templates are now in the database.`);
}