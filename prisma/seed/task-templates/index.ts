// prisma/seed/task-templates/index.ts - ALTERNATIVE APPROACH
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
    
    // First, clean existing data - use try/catch in case tables are empty
    console.log('Cleaning existing templates...');
    try {
        // Cast to any to bypass TypeScript issues
        await (prisma as any).taskTemplateItem.deleteMany();
        await prisma.taskTemplate.deleteMany();
    } catch (e) {
        console.log('Tables might be empty, continuing...');
    }
    
    // Process templates one by one instead of transaction to see clearer errors
    let successCount = 0;
    
    for (const template of allTemplates) {
        console.log(`Creating template: ${template.name}`);
        
        try {
            // Try the direct approach first (this is what works in the API)
            await prisma.taskTemplate.create({
                data: {
                    name: template.name,
                    description: template.description || null,
                    items: {
                        create: template.items.create.map(item => ({
                            title: item.title,
                            category: item.category
                        }))
                    }
                } as any // TypeScript bypass
            });
            
            successCount++;
            console.log(`✅ Successfully created: ${template.name}`);
            
        } catch (error) {
            console.error(`❌ Failed to create template ${template.name}:`, error);
            
            // Try alternative approach - create template then items
            try {
                const createdTemplate = await prisma.taskTemplate.create({
                    data: {
                        name: template.name + '_retry',
                        description: template.description || null
                    }
                });
                
                // Create items individually
                for (const item of template.items.create) {
                    await (prisma as any).taskTemplateItem.create({
                        data: {
                            title: item.title,
                            category: item.category,
                            templateId: createdTemplate.id
                        }
                    });
                }
                
                // Update name back to original
                await prisma.taskTemplate.update({
                    where: { id: createdTemplate.id },
                    data: { name: template.name }
                });
                
                successCount++;
                console.log(`✅ Successfully created (retry): ${template.name}`);
                
            } catch (retryError) {
                console.error(`❌ Retry also failed for ${template.name}:`, retryError);
            }
        }
    }
    
    console.log(`Seeding finished. ${successCount}/${allTemplates.length} templates created successfully.`);
}