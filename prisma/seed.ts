// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import { seedTaskTemplates } from './seed/task-templates/index';

const prisma = new PrismaClient();

async function main() {
  console.log(`Début du seeding...`);

  // It's critical to clean old data to prevent conflicts and ensure a fresh seed.
  console.log('Suppression des anciennes données...');
  await prisma.taskTemplate.deleteMany();
  console.log('Anciennes données supprimées.');

  // Execute the dedicated seeder for task templates.
  await seedTaskTemplates(prisma);

  console.log('Seeding terminé avec succès.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });