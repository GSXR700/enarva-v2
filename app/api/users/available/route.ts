// app/api/users/available/route.ts - GET AVAILABLE USERS FOR TEAM ASSIGNMENT
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
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const excludeTeamId = searchParams.get('excludeTeamId'); // Optional: exclude users already in this team
    const role = searchParams.get('role'); // Optional: filter by role
    const search = searchParams.get('search') || ''; // Optional: search by name/email

    // Build where clause for available users
    const where: any = {
      // Users who don't have active team memberships OR are not in the excluded team
      OR: [
        {
          // Users with no active team memberships
          teamMemberships: {
            none: {
              isActive: true
            }
          }
        },
        {
          // Users who are in teams but not in the excluded team (for editing existing teams)
          teamMemberships: {
            every: {
              OR: [
                { isActive: false },
                ...(excludeTeamId ? [{ teamId: { not: excludeTeamId } }] : [])
              ]
            }
          }
        }
      ]
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

    const availableUsers = await prisma.user.findMany({
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

    // Filter out users who already have active team memberships (unless we're editing and they're in the current team)
    const filteredUsers = availableUsers.filter(user => {
      const activeTeamMemberships = user.teamMemberships.filter(tm => tm.isActive);
      
      if (activeTeamMemberships.length === 0) {
        // User has no active team memberships - available
        return true;
      }
      
      if (excludeTeamId) {
        // User has active memberships but not in the team we're editing - not available
        return activeTeamMemberships.every(tm => tm.teamId === excludeTeamId);
      }
      
      // User has active team memberships and we're not editing - not available
      return false;
    });

    // Transform data for frontend consumption
    const transformedUsers = filteredUsers.map(user => ({
      id: user.id,
      name: user.name || 'Unnamed User',
      email: user.email || 'No email',
      role: user.role,
      image: user.image,
      onlineStatus: user.onlineStatus,
      lastSeen: user.lastSeen,
      currentTeam: user.teamMemberships.find(tm => tm.isActive)?.team || null
    }));

    return NextResponse.json({
      users: transformedUsers,
      total: transformedUsers.length,
      filters: {
        roles: ['ADMIN', 'MANAGER', 'TEAM_LEADER', 'TECHNICIAN', 'AGENT'],
        statuses: ['ONLINE', 'OFFLINE', 'AWAY', 'BUSY']
      }
    });

  } catch (error) {
    console.error('Failed to fetch available users:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}