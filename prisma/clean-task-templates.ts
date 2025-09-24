// Run this script to clean your existing task templates
// prisma/clean-task-templates.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanTaskTemplates() {
  console.log('🧹 Cleaning task templates - removing invalid fields...');

  try {
    const templates = await prisma.taskTemplate.findMany();
    console.log(`Found ${templates.length} templates to clean`);

    for (const template of templates) {
      console.log(`\nCleaning template: ${template.name}`);
      
      let tasks = template.tasks as any;
      if (Array.isArray(tasks)) {
        // Clean each task by removing invalid fields
        const cleanedTasks = tasks.map(task => ({
          title: task.title,
          category: task.category,
          // Remove priority, type defaults, and other invalid fields
          ...(task.description && { description: task.description })
        }));

        await prisma.taskTemplate.update({
          where: { id: template.id },
          data: {
            tasks: cleanedTasks
          }
        });

        console.log(`✅ Cleaned ${cleanedTasks.length} tasks in template: ${template.name}`);
      }
    }

    console.log('\n🎉 All templates cleaned successfully!');

  } catch (error) {
    console.error('❌ Error cleaning templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanTaskTemplates();