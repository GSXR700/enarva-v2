// prisma/seed/fix-templates.ts
import { PrismaClient, TaskCategory } from '@prisma/client';

const prisma = new PrismaClient();

const fixedTemplates = [
  {
    name: 'Nettoyage Appartement Standard',
    description: 'Nettoyage complet appartement résidentiel',
    category: TaskCategory.LIVING_SPACES,
    tasks: [
      { title: "Évaluer l'état général des pièces", category: TaskCategory.LIVING_SPACES },
      { title: 'Dépoussiérage complet des surfaces', category: TaskCategory.LIVING_SPACES },
      { title: 'Aspiration de tous les sols', category: TaskCategory.FLOORS },
      { title: 'Lavage des sols durs', category: TaskCategory.FLOORS },
      { title: 'Nettoyage complet cuisine', category: TaskCategory.KITCHEN },
      { title: 'Détartrage sanitaires', category: TaskCategory.BATHROOM_SANITARY },
      { title: 'Nettoyage vitres intérieures', category: TaskCategory.WINDOWS_JOINERY },
      { title: 'Vider les poubelles', category: TaskCategory.LIVING_SPACES }
    ]
  },
  {
    name: 'Nettoyage Bureau Standard', 
    description: 'Nettoyage quotidien espaces bureau',
    category: TaskCategory.LIVING_SPACES,
    tasks: [
      { title: 'Vider et désinfecter poubelles', category: TaskCategory.LIVING_SPACES },
      { title: 'Dépoussiérer bureaux et équipements', category: TaskCategory.LIVING_SPACES },
      { title: 'Aspirer moquettes', category: TaskCategory.FLOORS },
      { title: 'Laver sols durs', category: TaskCategory.FLOORS },
      { title: 'Nettoyer sanitaires', category: TaskCategory.BATHROOM_SANITARY },
      { title: 'Réapprovisionner consommables', category: TaskCategory.BATHROOM_SANITARY },
      { title: 'Nettoyage kitchenette', category: TaskCategory.KITCHEN }
    ]
  },
  {
    name: 'Fin de Chantier Villa',
    description: 'Nettoyage post-construction villa',
    category: TaskCategory.GENERAL,
    tasks: [
      { title: 'Évacuation gravats', category: TaskCategory.LOGISTICS_ACCESS },
      { title: 'Nettoyage façades', category: TaskCategory.EXTERIOR_FACADE },
      { title: 'Décollement films vitres', category: TaskCategory.WINDOWS_JOINERY },
      { title: 'Nettoyage vitres complet', category: TaskCategory.WINDOWS_JOINERY },
      { title: 'Dépoussiérage intensif sols', category: TaskCategory.FLOORS },
      { title: 'Cristallisation marbre', category: TaskCategory.FLOORS },
      { title: 'Nettoyage murs plafonds', category: TaskCategory.WALLS_BASEBOARDS },
      { title: 'Détartrage sanitaires neufs', category: TaskCategory.BATHROOM_SANITARY }
    ]
  }
];

async function fixTemplates() {
  console.log('🔧 Fixing task templates...');
  
  await prisma.taskTemplate.deleteMany({});
  
  for (const template of fixedTemplates) {
    await prisma.taskTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        category: template.category,
        tasks: template.tasks,
        isActive: true
      }
    });
    console.log(`✅ Created: ${template.name} (${template.tasks.length} tasks)`);
  }
  
  console.log('🎉 Templates fixed successfully!');
  process.exit(0);
}

fixTemplates().catch(console.error);