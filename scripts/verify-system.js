// scripts/verify-system.js
// Script to verify the system is working correctly for mission creation

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySystem() {
  console.log('🔍 Verifying system for mission creation...');
  
  try {
    console.log('1. Checking team leaders...');
    
    const teamLeaders = await prisma.user.findMany({
      where: { role: 'TEAM_LEADER' },
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: {
            team: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    console.log(`   ✅ Found ${teamLeaders.length} team leader(s)`);
    
    if (teamLeaders.length === 0) {
      console.log('   ❌ No team leaders found! Please create one or run the fix script.');
      return false;
    }

    // Check each team leader
    for (const leader of teamLeaders) {
      console.log(`   📋 Team Leader: ${leader.name} (${leader.email})`);
      console.log(`      Teams: ${leader.teamMemberships.map(tm => tm.team.name).join(', ') || 'None'}`);
      
      // Check specialties for team members
      const teamMembership = await prisma.teamMember.findFirst({
        where: {
          userId: leader.id,
          isActive: true
        }
      });

      if (teamMembership) {
        const hasManagement = teamMembership.specialties.includes('TEAM_MANAGEMENT');
        console.log(`      Specialties: ${teamMembership.specialties.join(', ')}`);
        console.log(`      Has Team Management: ${hasManagement ? '✅' : '⚠️'}`);
      } else {
        console.log(`      ⚠️  No active team membership found`);
      }
    }

    console.log('2. Checking teams...');
    
    const teams = await prisma.team.findMany({
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        }
      }
    });

    console.log(`   ✅ Found ${teams.length} team(s)`);
    
    for (const team of teams) {
      const teamLeaderCount = team.members.filter(m => m.user.role === 'TEAM_LEADER').length;
      console.log(`   📋 Team: ${team.name}`);
      console.log(`      Members: ${team.members.length}`);
      console.log(`      Team Leaders: ${teamLeaderCount}`);
      
      if (teamLeaderCount === 0) {
        console.log(`      ⚠️  No team leader assigned to this team`);
      }
    }

    console.log('3. Checking leads for mission creation...');
    
    const leads = await prisma.lead.findMany({
      where: {
        status: {
          in: ['NEW', 'QUALIFIED', 'TO_QUALIFY', 'WAITING_INFO', 'VISIT_PLANNED', 'QUOTE_SENT']
        }
      },
      take: 3
    });

    console.log(`   ✅ Found ${leads.length} available lead(s) for mission creation`);
    
    if (leads.length === 0) {
      console.log('   ⚠️  No leads available. Checking if any leads exist...');
      
      const anyLeads = await prisma.lead.findMany({ take: 3 });
      
      if (anyLeads.length === 0) {
        console.log('   ❌ No leads found in system. You need to create leads first.');
      } else {
        console.log('   📋 Found leads with other statuses:');
        anyLeads.forEach(lead => {
          console.log(`      - ${lead.firstName} ${lead.lastName} (${lead.status})`);
        });
        console.log('   💡 You can still create missions with these leads.');
      }
    } else {
      leads.forEach(lead => {
        console.log(`      📋 Lead: ${lead.firstName} ${lead.lastName} (${lead.status})`);
      });
    }

    console.log('4. Testing mission creation logic...');
    
    // Simulate the mission creation logic
    const availableTeamLeaders = await prisma.user.findMany({
      where: {
        role: 'TEAM_LEADER',
        teamMemberships: {
          some: {
            isActive: true,
            availability: 'AVAILABLE'
          }
        }
      },
      include: {
        teamMemberships: {
          where: { isActive: true },
          include: {
            team: true
          }
        }
      }
    });

    console.log(`   ✅ Found ${availableTeamLeaders.length} available team leader(s) for missions`);

    if (availableTeamLeaders.length === 0) {
      // Try fallback - any team leader
      const anyTeamLeaders = await prisma.user.count({
        where: { role: 'TEAM_LEADER' }
      });

      if (anyTeamLeaders > 0) {
        console.log(`   ⚠️  Found ${anyTeamLeaders} team leaders but none marked as available`);
        console.log('      The system will auto-assign them anyway');
      } else {
        console.log('   ❌ No team leaders found at all!');
        return false;
      }
    }

    console.log('5. Checking recent missions...');
    
    const recentMissions = await prisma.mission.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        teamLeader: {
          select: {
            name: true,
            role: true
          }
        }
      }
    });

    console.log(`   ✅ Found ${recentMissions.length} recent mission(s)`);
    
    recentMissions.forEach(mission => {
      console.log(`      📋 ${mission.missionNumber}: ${mission.lead.firstName} ${mission.lead.lastName}`);
      console.log(`         Team Leader: ${mission.teamLeader?.name || 'None'} (${mission.status})`);
    });

    console.log('\n🎉 System Verification Complete!');
    console.log('\n📊 Summary:');
    console.log(`   Team Leaders: ${teamLeaders.length}`);
    console.log(`   Teams: ${teams.length}`);
    console.log(`   Available Leads: ${leads.length}`);
    console.log(`   Available Team Leaders for Missions: ${availableTeamLeaders.length}`);
    console.log(`   Recent Missions: ${recentMissions.length}`);

    // Final recommendation
    const totalLeads = leads.length > 0 ? leads.length : (await prisma.lead.count());
    
    if (teamLeaders.length > 0 && totalLeads > 0) {
      console.log('\n✅ System appears ready for mission creation!');
      console.log('\n📝 Try creating a mission now:');
      console.log('   1. Go to Missions → New Mission');
      console.log('   2. Select a lead');
      console.log('   3. Set scheduled date and other details');
      console.log('   4. The system will auto-assign a team leader');
      return true;
    } else {
      console.log('\n⚠️  System needs attention:');
      if (teamLeaders.length === 0) {
        console.log('   - Create team leaders first');
      }
      if (totalLeads === 0) {
        console.log('   - Create leads first');
      }
      return false;
    }

  } catch (error) {
    console.error('❌ System verification failed:', error);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Quick fix function
async function quickFix() {
  console.log('🔧 Running quick fix for common issues...');
  
  try {
    await prisma.$transaction(async (tx) => {
      // Fix 1: Ensure all team leaders have team management specialty
      const teamLeadersInTeams = await tx.teamMember.findMany({
        where: {
          user: { role: 'TEAM_LEADER' },
          isActive: true
        },
        include: { user: true }
      });

      for (const member of teamLeadersInTeams) {
        if (!member.specialties.includes('TEAM_MANAGEMENT')) {
          await tx.teamMember.update({
            where: { id: member.id },
            data: {
              specialties: [...member.specialties, 'TEAM_MANAGEMENT']
            }
          });
          console.log(`   ✅ Added TEAM_MANAGEMENT to ${member.user.name}`);
        }
      }

      // Fix 2: Set all team leaders to available by default
      await tx.teamMember.updateMany({
        where: {
          user: { role: 'TEAM_LEADER' },
          availability: { not: 'AVAILABLE' }
        },
        data: {
          availability: 'AVAILABLE'
        }
      });

      console.log('   ✅ Set all team leaders to AVAILABLE');

      // Fix 3: Ensure all team memberships are active
      await tx.teamMember.updateMany({
        where: {
          user: { role: 'TEAM_LEADER' },
          isActive: false
        },
        data: {
          isActive: true
        }
      });

      console.log('   ✅ Activated all team leader memberships');
    });

    console.log('🎉 Quick fix completed!');
    
  } catch (error) {
    console.error('❌ Quick fix failed:', error);
  }
}

// Run verification or quick fix based on command line argument
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'quick-fix') {
    quickFix()
      .then(() => {
        console.log('✨ Quick fix completed! Run verification again.');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Quick fix failed:', error);
        process.exit(1);
      });
  } else {
    verifySystem()
      .then((success) => {
        if (success) {
          console.log('✨ System verification passed!');
          process.exit(0);
        } else {
          console.log('⚠️  System verification found issues. Run quick-fix or manual fixes.');
          process.exit(1);
        }
      })
      .catch((error) => {
        console.error('💥 Verification failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { verifySystem, quickFix };