// prisma/seed/task-templates/index.ts
import { PrismaClient, TaskCategory } from '@prisma/client';
import { finChantierTemplates } from './fin-chantier';
import { residentielTemplates } from './residentiel';
import { bureauxTemplates } from './bureaux';
import { mobilierTextileTemplates } from './mobilier-textile';
import { entretienSpecialiseTemplates } from './entretien-specialise';

// Define types that match the Prisma schema, using the TaskCategory enum
type TaskItem = {
  title: string;
  category: TaskCategory;
};

type TemplateData = {
  name: string;
  description: string | null;
  tasks: TaskItem[];
  category: TaskCategory; // Use the TaskCategory enum here
};

// Helper to validate and cast the category string to the TaskCategory enum
function toTaskCategory(categoryStr: string): TaskCategory {
  if (Object.values(TaskCategory).includes(categoryStr as TaskCategory)) {
    return categoryStr as TaskCategory;
  }
  // Fallback for invalid categories to prevent seeding errors
  console.warn(`Invalid category "${categoryStr}" found. Defaulting to 'GENERAL'.`);
  return TaskCategory.GENERAL; 
}

// Transform the raw template data to match the correct schema structure
const transformTemplate = (template: any): TemplateData => {
  const tasks = template.items.create;
  const categoryStr = tasks[0]?.category || 'GENERAL';

  return {
    name: template.name,
    description: template.description || null,
    tasks: tasks.map((task: any) => ({
        ...task,
        category: toTaskCategory(task.category) // Ensure each task has a valid category
    })),
    category: toTaskCategory(categoryStr), // Use the first item's category for the template
  };
};

// Combine and transform all templates from different files
const allTemplates = [
  ...residentielTemplates.map(transformTemplate),
  ...finChantierTemplates.map(transformTemplate),
  ...bureauxTemplates.map(transformTemplate),
  ...mobilierTextileTemplates.map(transformTemplate),
  ...entretienSpecialiseTemplates.map(transformTemplate),
];

export async function seedTaskTemplates(prisma: PrismaClient) {
  console.log('🌱 Starting TaskTemplate seeding...');
  
  try {
    console.log('🧹 Cleaning existing task templates...');
    await prisma.taskTemplate.deleteMany({});
    console.log('✅ Existing templates cleaned.');
    
    let successCount = 0;
    const totalTemplates = allTemplates.length;
    
    // Process each template individually for robust error handling
    for (const template of allTemplates) {
      console.log(`📝 Creating template: ${template.name}`);
      
      try {
        await prisma.taskTemplate.create({
          data: {
            name: template.name,
            description: template.description,
            // The 'tasks' field in Prisma schema expects JSON.
            // Prisma client handles the serialization automatically.
            tasks: template.tasks,
            category: template.category, // This is now correctly typed as TaskCategory
            isActive: true
          }
        });
        
        successCount++;
        console.log(`✅ Successfully created: ${template.name}`);
        
      } catch (error) {
        console.error(`❌ Failed to create template "${template.name}":`, error);
      }
    }
    
    console.log(`🎉 TaskTemplate seeding completed: ${successCount}/${totalTemplates} templates created successfully.`);
    
    if (successCount < totalTemplates) {
      console.warn(`⚠️ Warning: ${totalTemplates - successCount} templates failed to create.`);
    }
    
  } catch (error) {
    console.error('💥 Fatal error during TaskTemplate seeding:', error);
    throw error; // Re-throw to indicate that the seeding process failed
  }
}
