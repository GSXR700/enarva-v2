// app/api/users/available/route.ts - FIXED TO PROPERLY SHOW TEAM LEADERS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const excludeTeamId = searchParams.get('excludeTeamId');
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const includeAssigned = searchParams.get('includeAssigned') === 'true';

    console.log('Fetching available users with params:', {
      excludeTeamId,
      role,
      search,
      includeAssigned
    });

    // Build the where clause for filtering users
    const where: any = {
      // Don't exclude users based on team memberships by default
      // We'll handle this logic separately
    };

    // Add role filter if specified
    if (role) {
      where.role = role;
    }

    // Add search filter if specified
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get all users matching basic criteria
    const allUsers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        onlineStatus: true,
        lastSeen: true,
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
      },
      orderBy: [
        { role: 'desc' }, // Team leaders first
        { name: 'asc' }
      ]
    });

    console.log(`Found ${allUsers.length} users before filtering`);

    // Filter users based on availability logic
    const availableUsers = allUsers.filter(user => {
      const activeTeamMemberships = user.teamMemberships.filter(tm => tm.isActive);
      
      // If includeAssigned is true, include all users regardless of team membership
      if (includeAssigned) {
        return true;
      }
      
      // Special handling for team leaders - they are often available even if assigned
      if (user.role === 'TEAM_LEADER') {
        // Team leaders are available if:
        // 1. They have no team memberships, OR
        // 2. They're not in the excluded team (if specified), OR  
        // 3. They're available for mission assignment
        if (activeTeamMemberships.length === 0) {
          return true; // Team leader with no team - available
        }
        
        if (excludeTeamId) {
          // If we're excluding a specific team, show team leaders not in that team
          return !activeTeamMemberships.some(tm => tm.teamId === excludeTeamId);
        }
        
        // For mission creation, team leaders are generally available
        return true;
      }
      
      // For non-team leaders
      if (activeTeamMemberships.length === 0) {
        // User has no active team memberships - available
        return true;
      }
      
      if (excludeTeamId) {
        // User has active memberships but we're excluding a team - 
        // show users who are ONLY in the excluded team (for editing that team)
        return activeTeamMemberships.every(tm => tm.teamId === excludeTeamId);
      }
      
      // Default: users with existing team memberships are not available for new teams
      return false;
    });

    console.log(`Filtered to ${availableUsers.length} available users`);

    // Transform data for frontend consumption
    const transformedUsers = availableUsers.map(user => ({
      id: user.id,
      name: user.name || 'Unnamed User',
      email: user.email || 'No email',
      role: user.role,
      image: user.image,
      onlineStatus: user.onlineStatus,
      lastSeen: user.lastSeen,
      currentTeam: user.teamMemberships.find(tm => tm.isActive)?.team || null,
      teamCount: user.teamMemberships.filter(tm => tm.isActive).length
    }));

    // Separate team leaders for easier frontend handling
    const teamLeaders = transformedUsers.filter(u => u.role === 'TEAM_LEADER');
    const otherUsers = transformedUsers.filter(u => u.role !== 'TEAM_LEADER');

    console.log(`Team leaders found: ${teamLeaders.length}`);
    console.log('Team leaders:', teamLeaders.map(tl => `${tl.name} (${tl.email})`));

    return NextResponse.json({
      users: transformedUsers,
      teamLeaders, // Separate list for easy access
      otherUsers, // Non-team leaders
      total: transformedUsers.length,
      filters: {
        roles: ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'TECHNICIAN', 'AGENT'],
        statuses: ['ONLINE', 'OFFLINE', 'AWAY', 'BUSY']
      },
      summary: {
        totalUsers: transformedUsers.length,
        teamLeaders: teamLeaders.length,
        availableForAssignment: transformedUsers.filter(u => u.teamCount === 0).length,
        withExistingTeams: transformedUsers.filter(u => u.teamCount > 0).length
      }
    });

  } catch (error) {
    console.error('Failed to fetch available users:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}