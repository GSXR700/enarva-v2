// prisma/fix-task-templates.ts - Run this to fix your templates
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTaskTemplates() {
  console.log('🔧 Fixing task templates data structure...');

  try {
    // First, let's see what we have
    const existingTemplates = await prisma.taskTemplate.findMany();
    console.log(`Found ${existingTemplates.length} existing templates`);

    for (const template of existingTemplates) {
      console.log(`\nProcessing template: ${template.name}`);
      console.log(`Current tasks structure:`, JSON.stringify(template.tasks, null, 2));

      let extractedTasks: any[] = [];

      if (template.tasks) {
        if (Array.isArray(template.tasks)) {
          extractedTasks = template.tasks;
        } else if (typeof template.tasks === 'object') {
          // Handle nested structure
          const tasksObj = template.tasks as any;
          
          if (tasksObj.items?.create && Array.isArray(tasksObj.items.create)) {
            extractedTasks = tasksObj.items.create;
          } else if (tasksObj.items && Array.isArray(tasksObj.items)) {
            extractedTasks = tasksObj.items;
          } else if (Array.isArray(Object.values(tasksObj))) {
            extractedTasks = Object.values(tasksObj);
          }
        }
      }

      console.log(`Extracted ${extractedTasks.length} tasks`);

      if (extractedTasks.length > 0) {
        // Update the template with the correct structure
        await prisma.taskTemplate.update({
          where: { id: template.id },
          data: {
            tasks: extractedTasks, // Store as simple array
          },
        });
        console.log(`✅ Updated template: ${template.name} with ${extractedTasks.length} tasks`);
      } else {
        console.log(`⚠️ No tasks found for template: ${template.name}`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fixes...');
    const updatedTemplates = await prisma.taskTemplate.findMany();
    
    for (const template of updatedTemplates) {
      const taskCount = Array.isArray(template.tasks) ? template.tasks.length : 0;
      console.log(`${template.name}: ${taskCount} tasks`);
    }

    console.log('\n🎉 Task templates fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTaskTemplates();