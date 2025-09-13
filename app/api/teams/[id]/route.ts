// app/api/teams/[id]/route.ts - INDIVIDUAL TEAM API OPERATIONS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for team update
const updateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').optional(),
  description: z.string().optional().nullable(),
});

// GET /api/teams/[id] - Get individual team with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                onlineStatus: true,
                lastSeen: true
              }
            }
          },
          orderBy: [
            { user: { role: 'desc' } }, // Team leaders first
            { joinedAt: 'asc' }
          ]
        },
        missions: {
          select: {
            id: true,
            missionNumber: true,
            status: true,
            scheduledDate: true,
            lead: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { scheduledDate: 'desc' },
          take: 10 // Last 10 missions
        },
        _count: {
          select: {
            members: { where: { isActive: true } },
            missions: true
          }
        }
      }
    });

    if (!team) {
      return new NextResponse('Team not found', { status: 404 });
    }

    // Enhance team with computed data
    const teamLeader = team.members.find(member => member.user.role === 'TEAM_LEADER');
    const activeMembers = team.members.filter(member => member.isActive);
    const availableMembers = team.members.filter(member => 
      member.isActive && member.availability === 'AVAILABLE'
    );

    const enhancedTeam = {
      ...team,
      teamLeader: teamLeader ? {
        id: teamLeader.user.id,
        name: teamLeader.user.name,
        email: teamLeader.user.email,
        onlineStatus: teamLeader.user.onlineStatus,
        availability: teamLeader.availability
      } : null,
      stats: {
        totalMembers: activeMembers.length,
        availableMembers: availableMembers.length,
        completedMissions: team._count.missions,
        activeMembers: activeMembers.length,
        inactiveMembers: team.members.length - activeMembers.length
      },
      membersSummary: activeMembers.map(member => ({
        id: member.id,
        userId: member.user.id,
        name: member.user.name,
        role: member.user.role,
        availability: member.availability,
        specialties: member.specialties,
        experience: member.experience,
        joinedAt: member.joinedAt,
        hourlyRate: member.hourlyRate
      }))
    };

    return NextResponse.json(enhancedTeam);

  } catch (error) {
    console.error('Failed to fetch team:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/teams/[id] - Update team information
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id: teamId } = await params;
    const body = await request.json();

    // Validate input
    const validationResult = updateTeamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    const updatedTeam = await prisma.$transaction(async (tx) => {
      // Check if team exists
      const existingTeam = await tx.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            include: {
              user: { select: { name: true } }
            }
          }
        }
      });

      if (!existingTeam) {
        throw new Error('Team not found');
      }

      // Update team information
      const updateData: any = {};
      if (validatedData.name) updateData.name = validatedData.name;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;

      const updated = await tx.team.update({
        where: { id: teamId },
        data: updateData,
        include: {
          members: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  image: true,
                  onlineStatus: true,
                  lastSeen: true
                }
              }
            }
          }
        }
      });

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Using valid enum value
          title: 'Team updated',
          description: `Team "${existingTeam.name}" was updated`,
          userId: user.id,
          metadata: {
            teamId: existingTeam.id,
            oldName: existingTeam.name,
            newName: validatedData.name || existingTeam.name,
            changes: Object.keys(updateData)
          }
        }
      });

      return updated;
    });

    return NextResponse.json(updatedTeam);

  } catch (error) {
    console.error('Failed to update team:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Team not found')) {
      return new NextResponse('Team not found', { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update team', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE /api/teams/[id] - Delete team (only if no active missions)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id: teamId } = await params;

    await prisma.$transaction(async (tx) => {
      // Check if team exists and has active missions
      const existingTeam = await tx.team.findUnique({
        where: { id: teamId },
        include: {
          missions: {
            where: {
              status: {
                in: ['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'CLIENT_VALIDATION']
              }
            }
          },
          members: true
        }
      });

      if (!existingTeam) {
        throw new Error('Team not found');
      }

      if (existingTeam.missions.length > 0) {
        throw new Error(`Cannot delete team with ${existingTeam.missions.length} active missions. Please complete or reassign all active missions first.`);
      }

      // Deactivate all team members first
      await tx.teamMember.updateMany({
        where: { teamId: teamId },
        data: { isActive: false }
      });

      // Delete the team
      await tx.team.delete({
        where: { id: teamId }
      });

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Using valid enum value
          title: 'Team deleted',
          description: `Team "${existingTeam.name}" was deleted`,
          userId: user.id,
          metadata: {
            teamId: existingTeam.id,
            teamName: existingTeam.name,
            membersCount: existingTeam.members.length
          }
        }
      });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Failed to delete team:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Team not found')) {
      return new NextResponse('Team not found', { status: 404 });
    }

    if (errorMessage.includes('Cannot delete team with')) {
      return NextResponse.json(
        { 
          error: 'Team has active missions', 
          details: errorMessage,
          suggestion: 'Please reassign or complete all missions before deleting the team.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete team', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}