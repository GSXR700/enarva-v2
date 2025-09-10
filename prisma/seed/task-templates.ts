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
    category: TaskCategory;
    tasks: TemplateItem[];
    isActive: boolean;
};

// This is the array of all your detailed checklist templates
const templates: Template[] = [
    // --- TEMPLATES FOR: Nettoyage Fin de Chantier ---
    {
        name: 'Visite Technique - Fin de Chantier (Villa Luxe)',
        description: 'Checklist d\'évaluation pour un nettoyage complet post-construction dans une villa de haut standing.',
        category: TaskCategory.GENERAL,
        isActive: true,
        tasks: [
            { category: TaskCategory.EXTERIOR_FACADE, title: 'État général des façades (pierre, crépi, etc.)' },
            { category: TaskCategory.EXTERIOR_FACADE, title: 'Présence de taches de peinture, ciment, poussière' },
            { category: TaskCategory.WINDOWS_JOINERY, title: 'État des vitres extérieures et cadres' },
            { category: TaskCategory.FLOORS, title: 'Inspection du Marbre (rayures, taches, besoin de cristallisation ?)' },
            { category: TaskCategory.FLOORS, title: 'Inspection du Parquet (humidité, traces)' },
            { category: TaskCategory.BATHROOM_SANITARY, title: 'Vérification des joints et traces de calcaire' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Noter les points d\'accès à l\'eau et électricité' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Estimer le volume des gravats et déchets de chantier à évacuer' },
        ]
    },
    {
        name: 'Opération - Fin de Chantier (Villa Luxe)',
        description: 'Plan d\'action détaillé pour l\'exécution du nettoyage fin de chantier.',
        category: TaskCategory.GENERAL,
        isActive: true,
        tasks: [
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Installer les équipements de protection (bâches, protections)' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Évacuer les gros déchets et gravats' },
            { category: TaskCategory.EXTERIOR_FACADE, title: 'Nettoyer les façades (haute pression si nécessaire)' },
            { category: TaskCategory.WINDOWS_JOINERY, title: 'Décoller les films de protection des vitres' },
            { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyer l\'ensemble des vitres (intérieur/extérieur)' },
            { category: TaskCategory.FLOORS, title: 'Cristallisation du marbre et lustrage' },
            { category: TaskCategory.FLOORS, title: 'Nettoyage et traitement du parquet' },
            { category: TaskCategory.WALLS_BASEBOARDS, title: 'Lessivage des murs et plafonds' },
            { category: TaskCategory.BATHROOM_SANITARY, title: 'Détartrage complet des sanitaires' },
            { category: TaskCategory.KITCHEN, title: 'Nettoyage de la cuisine et électroménager' },
        ]
    },
    // --- TEMPLATES FOR: Résidentiel / Particuliers ---
    {
        name: 'Visite Technique - Appartement Standard',
        description: 'Évaluation des besoins de nettoyage pour un appartement de particulier.',
        category: TaskCategory.LIVING_SPACES,
        isActive: true,
        tasks: [
            { category: TaskCategory.LIVING_SPACES, title: 'État général des pièces à vivre' },
            { category: TaskCategory.KITCHEN, title: 'Inspection de la cuisine (graisse, calcaire, électroménager)' },
            { category: TaskCategory.BATHROOM_SANITARY, title: 'État des salles de bain (calcaire, moisissures)' },
            { category: TaskCategory.FLOORS, title: 'Type et état des sols (carrelage, parquet, moquette)' },
            { category: TaskCategory.WINDOWS_JOINERY, title: 'État des vitres et encadrements' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Points d\'eau et électricité disponibles' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Accès (ascenseur, escaliers, parking)' },
        ]
    },
    {
        name: 'Opération - Nettoyage Appartement Standard',
        description: 'Processus de nettoyage complet pour un appartement particulier.',
        category: TaskCategory.LIVING_SPACES,
        isActive: true,
        tasks: [
            { category: TaskCategory.LIVING_SPACES, title: 'Dépoussiérage de tous les meubles et surfaces' },
            { category: TaskCategory.LIVING_SPACES, title: 'Aspirateur sur tous les sols textiles' },
            { category: TaskCategory.FLOORS, title: 'Lavage des sols durs (carrelage, parquet)' },
            { category: TaskCategory.KITCHEN, title: 'Nettoyage complet de la cuisine et électroménager' },
            { category: TaskCategory.BATHROOM_SANITARY, title: 'Détartrage et désinfection des sanitaires' },
            { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyage des vitres intérieures' },
            { category: TaskCategory.LIVING_SPACES, title: 'Vider les poubelles et remplacer les sacs' },
        ]
    },
    // --- TEMPLATES FOR: Bureaux et Espaces Professionnels ---
    {
        name: 'Visite Technique - Bureau (PME)',
        description: 'Évaluation pour un nettoyage d\'espaces de bureaux PME.',
        category: TaskCategory.LIVING_SPACES,
        isActive: true,
        tasks: [
            { category: TaskCategory.LIVING_SPACES, title: 'Superficie totale et nombre de postes de travail' },
            { category: TaskCategory.LIVING_SPACES, title: 'État général des bureaux et espaces communs' },
            { category: TaskCategory.KITCHEN, title: 'Présence et état de l\'espace kitchenette/pause' },
            { category: TaskCategory.BATHROOM_SANITARY, title: 'Nombre et état des sanitaires' },
            { category: TaskCategory.FLOORS, title: 'Types de revêtements de sol' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Fréquence souhaitée (quotidien, hebdomadaire)' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Heures d\'intervention possibles' },
        ]
    },
    {
        name: 'Opération - Nettoyage Bureau Quotidien',
        description: 'Routine de nettoyage quotidien pour espaces de bureaux.',
        category: TaskCategory.LIVING_SPACES,
        isActive: true,
        tasks: [
            { category: TaskCategory.LIVING_SPACES, title: 'Vider et désinfecter les poubelles' },
            { category: TaskCategory.LIVING_SPACES, title: 'Dépoussiérer les bureaux et claviers' },
            { category: TaskCategory.FLOORS, title: 'Aspirer les tapis et moquettes' },
            { category: TaskCategory.FLOORS, title: 'Laver les sols durs' },
            { category: TaskCategory.BATHROOM_SANITARY, title: 'Nettoyage et réapprovisionnement des sanitaires' },
            { category: TaskCategory.KITCHEN, title: 'Nettoyage de l\'espace kitchenette' },
            { category: TaskCategory.WINDOWS_JOINERY, title: 'Nettoyage des vitres (si planifié)' },
        ]
    },
    // --- TEMPLATES FOR: Mobilier et Textile ---
    {
        name: 'Visite Technique - Canapé en Tissu',
        description: 'Évaluation d\'un canapé en tissu avant nettoyage par injection-extraction.',
        category: TaskCategory.LIVING_SPACES,
        isActive: true,
        tasks: [
            { category: TaskCategory.LIVING_SPACES, title: 'Type et composition du tissu (coton, polyester, mélange)' },
            { category: TaskCategory.LIVING_SPACES, title: 'État général du canapé (usure, décoloration)' },
            { category: TaskCategory.LIVING_SPACES, title: 'Identifier la nature des taches (alimentaire, encre, graisse)' },
            { category: TaskCategory.LIVING_SPACES, title: 'Vérifier la présence d\'odeurs (animaux, humidité)' },
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'S\'assurer de la présence d\'une prise électrique à proximité' },
        ]
    },
    {
        name: 'Opération - Nettoyage Canapé Tissu',
        description: 'Processus de nettoyage d\'un canapé par injection-extraction.',
        category: TaskCategory.LIVING_SPACES,
        isActive: true,
        tasks: [
            { category: TaskCategory.LOGISTICS_ACCESS, title: 'Protéger le sol autour du canapé' },
            { category: TaskCategory.LIVING_SPACES, title: 'Aspirer en profondeur toute la surface du canapé' },
            { category: TaskCategory.LIVING_SPACES, title: 'Appliquer un détachant spécifique sur les taches tenaces' },
            { category: TaskCategory.LIVING_SPACES, title: 'Procéder au nettoyage par injection-extraction' },
            { category: TaskCategory.LIVING_SPACES, title: 'Répéter l\'extraction avec de l\'eau claire pour rincer' },
            { category: TaskCategory.LIVING_SPACES, title: 'Brosser les fibres pour un séchage uniforme' },
            { category: TaskCategory.LIVING_SPACES, title: 'Informer le client sur le temps de séchage (4-6h)' },
        ]
    },
];

export async function seedTaskTemplates(prisma: PrismaClient) {
    console.log('Seeding task templates...');
    // Use a transaction to ensure all templates are created or none are
    await prisma.$transaction(async (tx) => {
        for (const template of templates) {
            await tx.taskTemplate.upsert({
                where: { id: 'dummy-id-that-will-never-exist' }, // Use a dummy ID since name is not unique in schema
                update: {}, // Do nothing if it exists
                create: {
                    name: template.name,
                    description: template.description,
                    tasks: template.tasks,
                    category: template.category,
                    isActive: template.isActive,
                },
            });
        }
    });
    console.log(`Seeding finished. ${templates.length} templates are now in the database.`);
}