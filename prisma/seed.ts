// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';
import { seedTaskTemplates } from './seed/task-templates'; // Import the new seeder

const prisma = new PrismaClient()

async function main() {
  console.log(`Début du seeding...`)

  // Nettoyage de la base de données dans le bon ordre pour éviter les erreurs de contraintes
  console.log('Suppression des anciennes données...');
  await prisma.task.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.taskTemplate.deleteMany(); // Important: Clean old templates
  
  console.log('Anciennes données supprimées.');

  // --- Création des utilisateurs et des membres d'équipe ---
  const user1 = await prisma.user.create({
    data: {
      email: 'hassan.amrani@enarva.com',
      name: 'Hassan Amrani',
      role: 'TEAM_LEADER',
      teamMember: { create: { firstName: 'Hassan', lastName: 'Amrani', phone: '+212661000001', email: 'hassan.amrani@enarva.com', specialties: ['TEAM_MANAGEMENT', 'GENERAL_CLEANING'], experienceLevel: 'EXPERT' } },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'aicha.bensouda@enarva.com',
      name: 'Aicha Bensouda',
      role: 'TEAM_LEADER',
      teamMember: { create: { firstName: 'Aicha', lastName: 'Bensouda', phone: '+212661000002', email: 'aicha.bensouda@enarva.com', specialties: ['LUXURY_SURFACES', 'QUALITY_CONTROL'], experienceLevel: 'SENIOR' } },
    },
  });
  
  const user3 = await prisma.user.create({
    data: {
      email: 'fatima.benali@enarva.com',
      name: 'Fatima Benali',
      role: 'TECHNICIAN',
      teamMember: { create: { firstName: 'Fatima', lastName: 'Benali', phone: '+212661000003', email: 'fatima.benali@enarva.com', specialties: ['GENERAL_CLEANING', 'FLOOR_SPECIALIST'], experienceLevel: 'INTERMEDIATE' } },
    },
  });
  console.log(`Création de ${await prisma.user.count()} utilisateurs.`);

  // --- Création des Leads ---
  const lead1 = await prisma.lead.create({
    data: {
      firstName: 'Mohammed', 
      lastName: 'Benali', 
      email: 'm.benali@example.com', 
      phone: '+212612345678', 
      company: 'Villa Anfa', 
      leadType: 'PARTICULIER', 
      channel: 'WHATSAPP', 
      status: 'NEW', 
      score: 8, 
      propertyType: 'VILLA_LARGE', 
      estimatedSurface: 400, 
      urgencyLevel: 'HIGH_URGENT', 
      originalMessage: 'Bonjour, je souhaite un devis pour le nettoyage complet de ma villa à Anfa, Casablanca.', 
      assignedToId: user1.id,
    },
  });

  const lead2 = await prisma.lead.create({
    data: {
      firstName: 'Fatima', 
      lastName: 'Alaoui', 
      email: 'f.alaoui@business.com', 
      phone: '+212698765432', 
      company: 'Résidence Les Palmiers', 
      leadType: 'PROFESSIONNEL', 
      iceNumber: '001234567000089', 
      channel: 'EMAIL', 
      status: 'QUALIFIED', 
      score: 9, 
      propertyType: 'RESIDENCE_B2B', 
      estimatedSurface: 1200, 
      urgencyLevel: 'NORMAL', 
      originalMessage: 'Suite à notre conversation, je vous confirme notre besoin pour un nettoyage mensuel de notre résidence.', 
      assignedToId: user2.id,
    },
  });
  console.log(`Création de ${await prisma.lead.count()} leads.`);

  // --- Création d'un Devis pour un Lead (FIXED VERSION) ---
  const quote1 = await prisma.quote.create({
    data: {
      quoteNumber: 'DEV-2025-001', 
      type: 'STANDARD', 
      status: 'ACCEPTED', 
      surface: 400, 
      levels: 2,
      propertyType: 'VILLA_LARGE', 
      // Updated to match new Quote schema structure
      lineItems: [
        {
          id: "base-1",
          description: "Forfait de Base Grand Ménage",
          detail: "400m² x 2 niveaux = 800m² x 14 DH/m²",
          amount: 11200,
          editable: true
        },
        {
          id: "majoration-1", 
          description: "Forfait Prestations Renforcées",
          detail: "Coefficients appliqués (Délai urgent, Matériaux luxe)",
          amount: 1440,
          editable: true
        }
      ],
      subTotalHT: new Decimal(12640.00),
      vatAmount: new Decimal(2528.00),
      totalTTC: new Decimal(15168.00),
      finalPrice: new Decimal(15170.00), // Rounded
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      leadId: lead1.id,
    },
  });
  console.log(`Création de ${await prisma.quote.count()} devis.`);
  
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