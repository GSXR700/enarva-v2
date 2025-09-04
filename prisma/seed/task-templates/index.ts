// prisma/seed/task-templates/index.ts
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
    // ... import and add other template arrays here as you create them
];

export async function seedTaskTemplates(prisma: PrismaClient) {
    console.log('Seeding task templates...');
    // Increase the transaction timeout to 30 seconds (30000 ms) to prevent timeout errors during seeding
    await prisma.$transaction(async (tx) => {
        for (const template of allTemplates) {
            await tx.taskTemplate.upsert({
                where: { name: template.name },
                update: {}, // Do nothing if it exists to avoid overwriting user changes
                create: template,
            });
        }
    },
    {
        timeout: 30000, // 30 seconds
    });
    console.log(`Seeding finished. ${allTemplates.length} templates are now in the database.`);
}