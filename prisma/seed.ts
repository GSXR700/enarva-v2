// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { seedTaskTemplates } from './seed/task-templates/index'; // Import the new seeder

const prisma = new PrismaClient()

async function main() {
  console.log(`Début du seeding...`)

  // Nettoyage de la base de données dans le bon ordre pour éviter les erreurs de contraintes
  console.log('Suppression des anciennes données...');
  await prisma.taskTemplate.deleteMany(); // Important: Clean old templates
  
  console.log('Anciennes données supprimées.');
  
  // --- CALL THE NEW TASK TEMPLATE SEEDER ---
  await seedTaskTemplates(prisma);

  console.log('Seeding terminé avec succès.');
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })