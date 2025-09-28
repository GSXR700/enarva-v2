// prisma/seed/fix-task-templates.ts - Run this to fix your templates
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
          // Already correct format
          extractedTasks = template.tasks;
        } else if (typeof template.tasks === 'object') {
          // Handle nested structure
          const tasksObj = template.tasks as any;
          
          // Try different nested structures
          if (tasksObj.items?.create && Array.isArray(tasksObj.items.create)) {
            extractedTasks = tasksObj.items.create;
          } else if (tasksObj.items && Array.isArray(tasksObj.items)) {
            extractedTasks = tasksObj.items;
          } else if (tasksObj.create && Array.isArray(tasksObj.create)) {
            extractedTasks = tasksObj.create;
          } else if (Array.isArray(Object.values(tasksObj))) {
            // Try to extract from object values
            const values = Object.values(tasksObj);
            if (values.length > 0 && Array.isArray(values[0])) {
              extractedTasks = values[0] as any[];
            } else {
              // Filter object values that look like tasks
              extractedTasks = values.filter(v => 
                v && 
                typeof v === 'object' && 
                'title' in (v as any)
              ) as any[];
            }
          }
        }
      }

      console.log(`Extracted ${extractedTasks.length} tasks`);

      // Validate and clean the extracted tasks
      const validTasks = extractedTasks.filter(task => {
        if (!task || typeof task !== 'object') return false;
        if (!task.title && !task.name) return false;
        return true;
      }).map(task => ({
        title: task.title || task.name || 'Tâche sans titre',
        description: task.description || null,
        category: task.category || 'GENERAL',
        type: task.type || 'EXECUTION',
        estimatedTime: task.estimatedTime || 60
      }));

      console.log(`Validated ${validTasks.length} tasks`);

      if (validTasks.length > 0) {
        // Update the template with the correct structure
        await prisma.taskTemplate.update({
          where: { id: template.id },
          data: {
            tasks: validTasks, // Store as simple array
          },
        });
        console.log(`✅ Updated template: ${template.name} with ${validTasks.length} tasks`);
      } else {
        console.log(`⚠️ No valid tasks found for template: ${template.name}`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fixes...');
    const updatedTemplates = await prisma.taskTemplate.findMany();
    
    for (const template of updatedTemplates) {
      // FIXED: Add null check and type assertion
      const taskCount = (template.tasks && Array.isArray(template.tasks)) ? template.tasks.length : 0;
      console.log(`${template.name}: ${taskCount} tasks`);
      
      // FIXED: Add null check before accessing array element
      if (taskCount > 0 && template.tasks && Array.isArray(template.tasks)) {
        console.log(`  Sample task:`, (template.tasks as any[])[0]);
      }
    }

    console.log('\n🎉 Task templates fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing templates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix if this file is executed directly
if (require.main === module) {
  fixTaskTemplates();
}

export default fixTaskTemplates;