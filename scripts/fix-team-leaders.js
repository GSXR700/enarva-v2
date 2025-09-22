// scripts/fix-team-leaders.js
// Script to fix team leader issues and ensure proper database relationships

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixTeamLeaders() {
  console.log('🔧 Starting team leader database cleanup and repair...');
  
  try {
    await prisma.$transaction(async (tx) => {
      console.log('1. Analyzing current team leader situation...');
      
      // Get all users with TEAM_LEADER role
      const teamLeaders = await tx.user.findMany({
        where: { role: 'TEAM_LEADER' },
        include: {
          teamMemberships: {
            where: { isActive: true },
            include: {
              team: true
            }
          }
        }
      });

      console.log(`   Found ${teamLeaders.length} users with TEAM_LEADER role`);

      // Get all teams
      const allTeams = await tx.team.findMany({
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: true
            }
          }
        }
      });

      console.log(`   Found ${allTeams.length} teams`);

      console.log('2. Identifying team leaders without team memberships...');
      
      const teamLeadersWithoutTeams = teamLeaders.filter(leader => 
        leader.teamMemberships.length === 0
      );

      console.log(`   Found ${teamLeadersWithoutTeams.length} team leaders without team memberships`);

      // For each team leader without team membership, try to assign them
      for (const leader of teamLeadersWithoutTeams) {
        console.log(`   Processing team leader: ${leader.name} (${leader.email})`);

        // Find a team without a team leader, or create a default team
        const teamWithoutLeader = allTeams.find(team => 
          !team.members.some(member => member.user.role === 'TEAM_LEADER')
        );

        if (teamWithoutLeader) {
          console.log(`     Assigning to existing team: ${teamWithoutLeader.name}`);
          
          await tx.teamMember.create({
            data: {
              userId: leader.id,
              teamId: teamWithoutLeader.id,
              isActive: true,
              availability: 'AVAILABLE',
              experience: 'SENIOR',
              specialties: ['TEAM_MANAGEMENT'],
              hourlyRate: null // Fix: Explicit null for optional field
            }
          });

          console.log(`     ✅ Team leader ${leader.name} assigned to team ${teamWithoutLeader.name}`);
        } else {
          // Create a new team for this team leader
          console.log(`     Creating new team for team leader: ${leader.name}`);
          
          const newTeam = await tx.team.create({
            data: {
              name: `Équipe ${leader.name}`,
              description: `Équipe dirigée par ${leader.name}`
            }
          });

          await tx.teamMember.create({
            data: {
              userId: leader.id,
              teamId: newTeam.id,
              isActive: true,
              availability: 'AVAILABLE',
              experience: 'SENIOR',
              specialties: ['TEAM_MANAGEMENT'],
              hourlyRate: null // Fix: Explicit null for optional field
            }
          });

          console.log(`     ✅ New team "${newTeam.name}" created with team leader ${leader.name}`);
        }
      }

      console.log('3. Validating team leader specialties...');
      
      // Ensure all team leaders have TEAM_MANAGEMENT specialty
      const teamMembersWithLeaderRole = await tx.teamMember.findMany({
        where: {
          user: { role: 'TEAM_LEADER' },
          isActive: true
        },
        include: {
          user: true
        }
      });

      for (const member of teamMembersWithLeaderRole) {
        if (!member.specialties.includes('TEAM_MANAGEMENT')) {
          console.log(`   Adding TEAM_MANAGEMENT specialty to ${member.user.name}`);
          
          await tx.teamMember.update({
            where: { id: member.id },
            data: {
              specialties: [...member.specialties, 'TEAM_MANAGEMENT']
            }
          });
        }
      }

      console.log('4. Cleaning up orphaned team memberships...');
      
      // Remove any team memberships where the user or team doesn't exist
      const allTeamMembers = await tx.teamMember.findMany();
      let cleanedCount = 0;

      for (const member of allTeamMembers) {
        try {
          const userExists = await tx.user.findUnique({
            where: { id: member.userId }
          });

          const teamExists = await tx.team.findUnique({
            where: { id: member.teamId }
          });

          if (!userExists || !teamExists) {
            console.log(`   Removing orphaned team membership: ${member.id}`);
            await tx.teamMember.delete({
              where: { id: member.id }
            });
            cleanedCount++;
          }
        } catch (error) {
          console.log(`   Error checking team membership ${member.id}, removing...`);
          await tx.teamMember.delete({
            where: { id: member.id }
          });
          cleanedCount++;
        }
      }

      console.log(`   ✅ Cleaned up ${cleanedCount} orphaned team memberships`);

      console.log('5. Final validation and summary...');
      
      // Get updated counts
      const finalTeamLeaders = await tx.user.findMany({
        where: { role: 'TEAM_LEADER' },
        include: {
          teamMemberships: {
            where: { isActive: true },
            include: {
              team: true
            }
          }
        }
      });

      const finalTeams = await tx.team.count();
      const finalTeamMembers = await tx.teamMember.count();

      console.log(`   📊 Final counts:`);
      console.log(`      Team Leaders: ${finalTeamLeaders.length}`);
      console.log(`      Teams: ${finalTeams}`);
      console.log(`      Team Members: ${finalTeamMembers}`);

      // Check if any team leaders still don't have teams
      const stillWithoutTeams = finalTeamLeaders.filter(leader => 
        leader.teamMemberships.length === 0
      );

      if (stillWithoutTeams.length > 0) {
        console.log(`   ⚠️  ${stillWithoutTeams.length} team leaders still without teams:`);
        stillWithoutTeams.forEach(leader => {
          console.log(`      - ${leader.name} (${leader.email})`);
        });
      } else {
        console.log(`   ✅ All team leaders now have team assignments`);
      }

      // Show team leader distribution
      console.log(`   📋 Team leader distribution:`);
      for (const leader of finalTeamLeaders) {
        if (leader.teamMemberships.length > 0) {
          const teams = leader.teamMemberships.map(tm => tm.team.name).join(', ');
          console.log(`      - ${leader.name}: ${teams}`);
        }
      }

      console.log('   ✅ Team leader validation complete');
    });
    
    console.log('🎉 Team leader cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Team leader cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Helper function to create a default team leader if none exist
async function createDefaultTeamLeader() {
  console.log('🔧 Creating default team leader...');
  
  try {
    await prisma.$transaction(async (tx) => {
      // Check if any team leaders exist
      const existingTeamLeaders = await tx.user.count({
        where: { role: 'TEAM_LEADER' }
      });

      if (existingTeamLeaders === 0) {
        console.log('   No team leaders found, creating default team leader...');

        // Create default team leader
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('TeamLeader123!', 12);

        const defaultTeamLeader = await tx.user.create({
          data: {
            name: 'Chef d\'Équipe Principal',
            email: 'teamleader@company.com',
            hashedPassword,
            role: 'TEAM_LEADER'
          }
        });

        // Create default team
        const defaultTeam = await tx.team.create({
          data: {
            name: 'Équipe Principale',
            description: 'Équipe principale de nettoyage'
          }
        });

        // Add team leader to team
        await tx.teamMember.create({
          data: {
            userId: defaultTeamLeader.id,
            teamId: defaultTeam.id,
            isActive: true,
            availability: 'AVAILABLE',
            experience: 'SENIOR',
            specialties: ['TEAM_MANAGEMENT', 'GENERAL_CLEANING'],
            hourlyRate: null // Fix: Explicit null for optional field
          }
        });

        console.log('   ✅ Default team leader created successfully!');
        console.log(`      Name: ${defaultTeamLeader.name}`);
        console.log(`      Email: ${defaultTeamLeader.email}`);
        console.log(`      Password: TeamLeader123!`);
        console.log(`      Team: ${defaultTeam.name}`);
      } else {
        console.log(`   ✅ Found ${existingTeamLeaders} existing team leaders, no need to create default`);
      }
    });
  } catch (error) {
    console.error('❌ Failed to create default team leader:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'create-default') {
    createDefaultTeamLeader()
      .then(() => {
        console.log('✨ Default team leader creation completed!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Default team leader creation failed:', error);
        process.exit(1);
      });
  } else {
    fixTeamLeaders()
      .then(() => {
        console.log('✨ Team leader database is now clean and ready!');
        console.log('\n📝 Next steps:');
        console.log('1. Try creating a mission again');
        console.log('2. If you still get errors, run: node scripts/fix-team-leaders.js create-default');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Cleanup failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { fixTeamLeaders, createDefaultTeamLeader };