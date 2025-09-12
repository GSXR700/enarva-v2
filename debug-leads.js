// debug-leads.js - Script de debug simple
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugLeads() {
  console.log('🔄 Debug Leads Database');
  console.log('========================\n');

  try {
    await prisma.$connect();
    console.log('✅ Base de données connectée\n');

    // Compter les leads
    const count = await prisma.lead.count();
    console.log(`📊 Nombre total de leads: ${count}\n`);

    if (count === 0) {
      console.log('❌ PROBLÈME: Aucun lead en base de données');
      console.log('   → L\'ingestion depuis le site web ne fonctionne pas');
      console.log('   → Testez l\'API d\'ingestion directement\n');
    } else {
      // Afficher les 5 derniers leads
      const leads = await prisma.lead.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          status: true,
          channel: true,
          createdAt: true,
          score: true
        }
      });

      console.log('📋 Derniers leads:');
      leads.forEach((lead, i) => {
        console.log(`   ${i+1}. ${lead.firstName} ${lead.lastName}`);
        console.log(`      Tel: ${lead.phone}`);
        console.log(`      Status: ${lead.status}`);
        console.log(`      Canal: ${lead.channel}`);
        console.log(`      Score: ${lead.score}`);
        console.log(`      Créé: ${lead.createdAt}`);
        console.log('');
      });
    }

    // Vérifier les utilisateurs
    const userCount = await prisma.user.count();
    console.log(`👥 Nombre d'utilisateurs: ${userCount}`);

    if (userCount > 0) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'MANAGER'] } },
        select: { name: true, email: true, role: true }
      });
      
      console.log('🔑 Utilisateurs avec permissions:');
      admins.forEach(user => {
        console.log(`   - ${user.name || user.email} (${user.role})`);
      });
    }

  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🏁 Debug terminé');
  }
}

debugLeads();