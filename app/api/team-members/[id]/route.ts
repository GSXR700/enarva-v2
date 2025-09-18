// app/api/team-members/[id]/route.ts - DELETE TEAM MEMBER API ROUTE
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

// DELETE /api/team-members/[id] - Remove team member
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id: teamMemberId } = await params;

    await prisma.$transaction(async (tx) => {
      // Get team member info before deletion
      const teamMember = await tx.teamMember.findUnique({
        where: { id: teamMemberId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          team: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!teamMember) {
        throw new Error('Team member not found');
      }

      // Check if this team member has active tasks
      const activeTasks = await tx.task.count({
        where: {
          assignedToId: teamMemberId,
          status: {
            in: ['ASSIGNED', 'IN_PROGRESS']
          }
        }
      });

      if (activeTasks > 0) {
        throw new Error(`Cannot remove team member with ${activeTasks} active task(s). Please reassign or complete all tasks first.`);
      }

      // Mark team member as inactive instead of deleting
      await tx.teamMember.update({
        where: { id: teamMemberId },
        data: { 
          isActive: false,
          availability: 'OFF_DUTY'
        }
      });

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Using valid enum value
          title: 'Team member removed',
          description: `${teamMember.user.name} was removed from team ${teamMember.team.name}`,
          userId: user.id,
          metadata: {
            removedUserId: teamMember.userId,
            teamId: teamMember.teamId,
            userName: teamMember.user.name,
            teamName: teamMember.team.name
          }
        }
      });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Failed to remove team member:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Team member not found')) {
      return new NextResponse('Team member not found', { status: 404 });
    }

    if (errorMessage.includes('Cannot remove team member with')) {
      return NextResponse.json(
        { 
          error: 'Team member has active tasks', 
          details: errorMessage,
          suggestion: 'Please reassign or complete all tasks before removing this team member.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to remove team member', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT /api/team-members/[id] - Update team member
export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id: teamMemberId } = await params;
    const body = await _request.json();

    const updatedTeamMember = await prisma.$transaction(async (tx) => {
      // Check if team member exists
      const existingMember = await tx.teamMember.findUnique({
        where: { id: teamMemberId },
        include: {
          user: true,
          team: true
        }
      });

      if (!existingMember) {
        throw new Error('Team member not found');
      }

      // Update user data if provided
      const userData: any = {};
      if (body.name) userData.name = body.name;
      if (body.email) userData.email = body.email;
      if (body.role) userData.role = body.role;

      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: existingMember.userId },
          data: userData
        });
      }

      // Update team member data
      const memberData: any = {};
      if (body.specialties !== undefined) memberData.specialties = body.specialties;
      if (body.experience !== undefined) memberData.experience = body.experience;
      if (body.availability !== undefined) memberData.availability = body.availability;
      if (body.hourlyRate !== undefined) memberData.hourlyRate = body.hourlyRate;
      if (body.isActive !== undefined) memberData.isActive = body.isActive;

      const updated = await tx.teamMember.update({
        where: { id: teamMemberId },
        data: memberData,
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
          },
          team: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Using valid enum value
          title: 'Team member updated',
          description: `${existingMember.user.name} information was updated`,
          userId: user.id,
          metadata: {
            teamMemberId: existingMember.id,
            userId: existingMember.userId,
            userName: existingMember.user.name,
            changes: { ...userData, ...memberData }
          }
        }
      });

      return updated;
    });

    return NextResponse.json(updatedTeamMember);

  } catch (error) {
    console.error('Failed to update team member:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Team member not found')) {
      return new NextResponse('Team member not found', { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update team member', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/team-members/[id] - Get team member details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: teamMemberId } = await params;

    const teamMember = await prisma.teamMember.findUnique({
      where: { id: teamMemberId },
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
        },
        team: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
            estimatedTime: true,
            actualTime: true,
            completedAt: true
          }
        }
      }
    });

    if (!teamMember) {
      return new NextResponse('Team member not found', { status: 404 });
    }

    // Calculate performance metrics
    const completedTasks = teamMember.tasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = teamMember.tasks.length;

    const enhancedMember = {
      ...teamMember,
      stats: {
        totalTasks,
        completedTasks,
        completionRate: totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : '0.0',
        averageTaskTime: teamMember.tasks.reduce((acc, task) => 
          acc + (task.actualTime || task.estimatedTime || 0), 0
        ) / (teamMember.tasks.length || 1),
        onTimeCompletion: teamMember.tasks.filter(task => 
          task.actualTime && task.estimatedTime && task.actualTime <= task.estimatedTime
        ).length
      }
    };

    return NextResponse.json(enhancedMember);

  } catch (error) {
    console.error('Failed to fetch team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}