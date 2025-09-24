// prisma/seed/task-templates/index.ts
import { PrismaClient, TaskCategory } from '@prisma/client';
import { finChantierTemplates } from './fin-chantier';
import { residentielTemplates } from './residentiel';
import { bureauxTemplates } from './bureaux';
import { mobilierTextileTemplates } from './mobilier-textile';
import { entretienSpecialiseTemplates } from './entretien-specialise';

// Define a strict type for a single task item, ensuring it uses the TaskCategory enum.
type TaskItem = {
  title: string;
  category: TaskCategory;
};

// Define the final structure of a template ready for Prisma, with a strongly-typed category.
type TemplateData = {
  name: string;
  description: string | null;
  tasks: TaskItem[];
  category: TaskCategory;
};

// A robust helper function to validate and cast a string to a TaskCategory enum member.
// This prevents seeding errors by defaulting to 'GENERAL' if a category is invalid.
function toTaskCategory(categoryStr: string): TaskCategory {
  if (Object.values(TaskCategory).includes(categoryStr as TaskCategory)) {
    return categoryStr as TaskCategory;
  }
  console.warn(`Invalid category "${categoryStr}" found. Defaulting to 'GENERAL'.`);
  return TaskCategory.GENERAL;
}

// Transforms the raw template structure from individual files into the format expected by the Prisma schema.
const transformTemplate = (template: any): TemplateData => {
  const tasks = template.items.create;
  // The template's primary category is derived from the first task in its list.
  const categoryStr = tasks[0]?.category || 'GENERAL';

  return {
    name: template.name,
    description: template.description || null,
    // Ensures every task within the template has its category validated.
    tasks: tasks.map((task: any) => ({
      ...task,
      category: toTaskCategory(task.category)
    })),
    category: toTaskCategory(categoryStr),
  };
};

// Consolidate all templates from their respective files into a single, transformed array.
const allTemplates = [
  ...residentielTemplates.map(transformTemplate),
  ...finChantierTemplates.map(transformTemplate),
  ...bureauxTemplates.map(transformTemplate),
  ...mobilierTextileTemplates.map(transformTemplate),
  ...entretienSpecialiseTemplates.map(transformTemplate),
];

// The main seeding function that orchestrates the entire process.
export async function seedTaskTemplates(prisma: PrismaClient) {
  console.log('🌱 Starting TaskTemplate seeding...');

  try {
    console.log('🧹 Cleaning existing task templates...');
    await prisma.taskTemplate.deleteMany({});
    console.log('✅ Existing templates cleaned.');

    let successCount = 0;
    const totalTemplates = allTemplates.length;

    // Iterate over each template to create it in the database, with detailed logging.
    for (const template of allTemplates) {
      console.log(`📝 Creating template: ${template.name}`);
      try {
        await prisma.taskTemplate.create({
          data: {
            name: template.name,
            description: template.description,
            // Prisma client automatically handles the JSON serialization for the 'tasks' field.
            tasks: template.tasks,
            category: template.category, // Category is now a valid enum member.
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
    throw error; // Re-throw the error to ensure the seed process fails loudly.
  }
}