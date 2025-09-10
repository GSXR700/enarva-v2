// prisma/seed/task-templates/index.ts - FINAL WORKING VERSION
import { PrismaClient } from '@prisma/client';
import { finChantierTemplates } from './fin-chantier';
import { residentielTemplates } from './residentiel';
import { bureauxTemplates } from './bureaux';
import { mobilierTextileTemplates } from './mobilier-textile';
import { entretienSpecialiseTemplates } from './entretien-specialise';

// Combine all templates from different categories into one array
const allTemplates = [
    ...residentielTemplates,
    ...finChantierTemplates,
    ...bureauxTemplates,
    ...mobilierTextileTemplates,
    ...entretienSpecialiseTemplates,
];

export async function seedTaskTemplates(prisma: PrismaClient) {
    console.log('Seeding task templates...');
    
    // First, clean existing data
    console.log('Cleaning existing templates...');
    try {
        await prisma.taskTemplateItem.deleteMany({});
        await prisma.taskTemplate.deleteMany({});
        console.log('✅ Cleaned existing data');
    } catch (error) {
        console.log('⚠️  Tables might be empty, continuing...');
    }
    
    let successCount = 0;
    
    for (const template of allTemplates) {
        console.log(`Creating template: ${template.name}`);
        
        try {
            // Use the exact same approach as the working API route
            const newTemplate = await prisma.taskTemplate.create({
                data: {
                    name: template.name,
                    description: template.description || null,
                    items: {
                        create: template.items.create.map((item) => ({
                            title: item.title,
                            category: item.category,
                        })),
                    },
                },
                include: {
                    items: true,
                },
            });
            
            successCount++;
            console.log(`✅ Successfully created: ${template.name} with ${newTemplate.items.length} items`);
            
        } catch (error) {
            console.error(`❌ Failed to create template ${template.name}:`, error);
        }
    }
    
    console.log(`\n🎉 Seeding completed! ${successCount}/${allTemplates.length} templates created successfully.`);
}