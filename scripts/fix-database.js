// scripts/fix-database.js
// Ultra-simple database cleanup script - Compatible version

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixDatabase() {
  console.log('🔧 Starting database cleanup and repair...');
  
  try {
    await prisma.$transaction(async (tx) => {
      console.log('1. Analyzing current database state...');
      
      // Get all team members (safe approach)
      const allTeamMembers = await tx.teamMember.findMany();
      console.log(`   Found ${allTeamMembers.length} team member records`);
      
      // Get all users
      const allUsers = await tx.user.findMany();
      console.log(`   Found ${allUsers.length} user records`);
      
      // Get all teams
      const allTeams = await tx.team.findMany();
      console.log(`   Found ${allTeams.length} team records`);
      
      console.log('2. Cleaning up invalid records...');
      
      let deletedCount = 0;
      
      // Check each team member individually
      for (const teamMember of allTeamMembers) {
        try {
          // Check if user exists
          const userExists = allUsers.find(u => u.id === teamMember.userId);
          
          // Check if team exists (if teamId is present)
          const teamExists = teamMember.teamId ? 
            allTeams.find(t => t.id === teamMember.teamId) : true;
          
          if (!userExists || !teamExists) {
            console.log(`   Deleting invalid team member: ${teamMember.id} (user: ${!!userExists}, team: ${!!teamExists})`);
            await tx.teamMember.delete({
              where: { id: teamMember.id }
            });
            deletedCount++;
          }
        } catch (error) {
          console.log(`   Error checking team member ${teamMember.id}:`, error.message);
          // Delete problematic records
          try {
            await tx.teamMember.delete({
              where: { id: teamMember.id }
            });
            deletedCount++;
          } catch (deleteError) {
            console.log(`   Could not delete problematic record ${teamMember.id}`);
          }
        }
      }
      
      console.log(`   ✅ Cleaned up ${deletedCount} invalid records`);
      
      console.log('3. Handling duplicate users...');
      
      // Get remaining team members after cleanup
      const remainingMembers = await tx.teamMember.findMany();
      
      // Group by userId to find duplicates
      const userIdGroups = {};
      
      for (const member of remainingMembers) {
        if (!userIdGroups[member.userId]) {
          userIdGroups[member.userId] = [];
        }
        userIdGroups[member.userId].push(member);
      }
      
      let duplicatesRemoved = 0;
      
      // Handle duplicates
      for (const [userId, members] of Object.entries(userIdGroups)) {
        if (members.length > 1) {
          console.log(`   Found ${members.length} team member records for user ${userId}`);
          // Keep the first one, delete the rest
          for (let i = 1; i < members.length; i++) {
            try {
              await tx.teamMember.delete({
                where: { id: members[i].id }
              });
              duplicatesRemoved++;
            } catch (error) {
              console.log(`   Could not delete duplicate record ${members[i].id}`);
            }
          }
        }
      }
      
      console.log(`   ✅ Removed ${duplicatesRemoved} duplicate records`);
      
      console.log('4. Fixing enum values and null fields...');
      
      // Get all remaining team members
      const finalMembers = await tx.teamMember.findMany();
      let fixedCount = 0;
      
      for (const member of finalMembers) {
        const updates = {};
        
        // Fix experience enum
        if (!['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT'].includes(member.experience)) {
          updates.experience = 'JUNIOR';
        }
        
        // Fix availability enum  
        if (!['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION'].includes(member.availability)) {
          updates.availability = 'AVAILABLE';
        }
        
        // Fix isActive field
        if (member.isActive === null || member.isActive === undefined) {
          updates.isActive = true;
        }
        
        // Apply updates if needed
        if (Object.keys(updates).length > 0) {
          try {
            await tx.teamMember.update({
              where: { id: member.id },
              data: updates
            });
            fixedCount++;
          } catch (error) {
            console.log(`   Could not update member ${member.id}:`, error.message);
          }
        }
      }
      
      console.log(`   ✅ Fixed ${fixedCount} records with invalid values`);
      
      console.log('5. Final validation...');
      
      // Final counts
      const finalUserCount = await tx.user.count();
      const finalTeamMemberCount = await tx.teamMember.count();
      const finalTeamCount = await tx.team.count();
      
      console.log(`   📊 Final counts:`);
      console.log(`      Users: ${finalUserCount}`);
      console.log(`      Team Members: ${finalTeamMemberCount}`);
      console.log(`      Teams: ${finalTeamCount}`);
      
      // Check for team leaders without teams
      const teamLeadersWithoutTeams = await tx.user.findMany({
        where: {
          role: 'TEAM_LEADER',
          teamMemberships: {
            none: {}
          }
        }
      });
      
      if (teamLeadersWithoutTeams.length > 0) {
        console.log(`   ⚠️  Found ${teamLeadersWithoutTeams.length} team leaders without team memberships:`);
        for (const leader of teamLeadersWithoutTeams) {
          console.log(`      - ${leader.name} (${leader.email})`);
        }
      }
      
      console.log('   ✅ Database validation complete');
    });
    
    console.log('🎉 Database cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
if (require.main === module) {
  fixDatabase()
    .then(() => {
      console.log('✨ Database is now clean and ready!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup failed:', error);
      process.exit(1);
    });
}

module.exports = { fixDatabase };