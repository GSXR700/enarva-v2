// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient()

async function main() {
  console.log(`Début du seeding...`)

  // Nettoyage de la base de données pour éviter les doublons
  await prisma.mission.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('Anciennes données supprimées.');

  // Création des utilisateurs et des membres d'équipe
  const user1 = await prisma.user.create({
    data: {
      email: 'hassan.amrani@enarva.com',
      name: 'Hassan Amrani',
      role: 'TEAM_LEADER',
      teamMember: {
        create: {
          firstName: 'Hassan',
          lastName: 'Amrani',
          phone: '+212661000001',
          email: 'hassan.amrani@enarva.com',
          specialties: ['TEAM_MANAGEMENT', 'GENERAL_CLEANING'],
          experienceLevel: 'EXPERT',
        },
      },
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: 'aicha.bensouda@enarva.com',
      name: 'Aicha Bensouda',
      role: 'TEAM_LEADER',
      teamMember: {
        create: {
          firstName: 'Aicha',
          lastName: 'Bensouda',
          phone: '+212661000002',
          email: 'aicha.bensouda@enarva.com',
          specialties: ['LUXURY_SURFACES', 'QUALITY_CONTROL'],
          experienceLevel: 'SENIOR',
        },
      },
    },
  });
  
  const user3 = await prisma.user.create({
    data: {
      email: 'fatima.benali@enarva.com',
      name: 'Fatima Benali',
      role: 'TECHNICIAN',
      teamMember: {
        create: {
          firstName: 'Fatima',
          lastName: 'Benali',
          phone: '+212661000003',
          email: 'fatima.benali@enarva.com',
          specialties: ['GENERAL_CLEANING', 'FLOOR_SPECIALIST'],
          experienceLevel: 'INTERMEDIATE',
        },
      },
    },
  });

  console.log(`Création de ${await prisma.user.count()} utilisateurs.`);

  // Création des Leads
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
      urgencyLevel: 'HIGH_URGENT', // <-- CORRECTION ICI
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

  // Création d'un Devis pour un Lead
  const quote1 = await prisma.quote.create({
    data: {
      quoteNumber: 'DEV-2025-001',
      type: 'STANDARD',
      status: 'ACCEPTED',
      surface: 400,
      propertyType: 'VILLA_LARGE',
      materials: 'LUXURY',
      distance: 15,
      accessibility: 'MEDIUM',
      urgency: 'HIGH_URGENT', // <-- CORRECTION ICI
      basePrice: new Decimal(7200.00),
      finalPrice: new Decimal(8640.00),
      coefficients: { "materials": 1.35, "urgency": 1.2 },
      expiresAt: new Date(),
      leadId: lead1.id,
    },
  });

  console.log(`Création de ${await prisma.quote.count()} devis.`);

  // Création d'une Mission associée au Devis
  const teamMember1 = await prisma.teamMember.findUnique({ where: { userId: user1.id } });
  const teamMember3 = await prisma.teamMember.findUnique({ where: { userId: user3.id } });

  if (teamMember1 && teamMember3) {
    await prisma.mission.create({
      data: {
        missionNumber: 'MISS-2025-001',
        status: 'SCHEDULED',
        priority: 'HIGH',
        scheduledDate: new Date(new Date().setDate(new Date().getDate() + 3)), // Dans 3 jours
        estimatedDuration: 6,
        address: '123 Boulevard Anfa, Casablanca',
        teamLeaderId: user1.id,
        leadId: lead1.id,
        quoteId: quote1.id,
        teamMembers: {
            connect: [
                { id: teamMember1.id },
                { id: teamMember3.id }
            ]
        }
      },
    });
    console.log(`Création de ${await prisma.mission.count()} mission.`);
  }

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