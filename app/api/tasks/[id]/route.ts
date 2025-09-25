import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
//import { TaskStatus } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        mission: {
          select: {
            id: true,
            missionNumber: true,
            address: true
          }
        }
      }
    });

    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleTaskUpdate(request, params);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleTaskUpdate(request, params);
}

async function handleTaskUpdate(
  request: NextRequest,
  params: Promise<{ id: string }>
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    const { id } = await params;
    const body = await request.json();

    console.log('🔧 Task Update Request:', { taskId: id, body, userId: user.id });

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: {
        mission: {
          select: {
            id: true,
            teamLeaderId: true,
            status: true
          }
        }
      }
    });

    if (!existingTask) {
      return new NextResponse('Task not found', { status: 404 });
    }

    // Authorization check
    const isAuthorized = (
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      existingTask.mission.teamLeaderId === user.id
    );

    if (!isAuthorized) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Build update data
    const updateData: any = {};

    // Handle status changes
    if (body.status) {
      updateData.status = body.status;
      
      // Auto-set timestamps based on status
      if (body.status === 'IN_PROGRESS' && existingTask.status !== 'IN_PROGRESS') {
        updateData.startedAt = new Date();
      } else if (body.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (body.status === 'VALIDATED' && existingTask.status !== 'VALIDATED') {
        updateData.validatedAt = new Date();
      }
    }

    // Handle other fields
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.actualTime !== undefined) updateData.actualTime = body.actualTime;
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime;
    if (body.startedAt !== undefined) updateData.startedAt = body.startedAt ? new Date(body.startedAt) : null;
    if (body.completedAt !== undefined) updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    if (body.validatedAt !== undefined) updateData.validatedAt = body.validatedAt ? new Date(body.validatedAt) : null;

    // Handle assignment - Convert User ID to TeamMember ID if needed
    if (body.assignedToId !== undefined) {
      if (body.assignedToId) {
        // Check if it's a User ID or TeamMember ID
        const isUserId = body.assignedToId.length < 30; // Simple heuristic
        
        if (isUserId) {
          // Find the corresponding TeamMember
          const teamMember = await prisma.teamMember.findFirst({
            where: {
              userId: body.assignedToId,
              isActive: true
            }
          });
          
          updateData.assignedToId = teamMember?.id || null;
        } else {
          updateData.assignedToId = body.assignedToId;
        }
      } else {
        updateData.assignedToId = null;
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        mission: {
          select: {
            id: true,
            missionNumber: true
          }
        }
      }
    });

    // Check if all tasks in the mission are completed
    if (body.status === 'COMPLETED') {
      const missionTasks = await prisma.task.findMany({
        where: { missionId: existingTask.mission.id }
      });

      const allTasksCompleted = missionTasks.every(task => 
        task.id === id ? true : task.status === 'COMPLETED' || task.status === 'VALIDATED'
      );

      if (allTasksCompleted && existingTask.mission.status === 'IN_PROGRESS') {
        await prisma.mission.update({
          where: { id: existingTask.mission.id },
          data: { 
            status: 'QUALITY_CHECK',
            actualEndTime: new Date()
          }
        });
      }
    }

    console.log('✅ Task updated successfully:', updatedTask.id);
    return NextResponse.json(updatedTask);

  } catch (error) {
    console.error('❌ Error updating task:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update task', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as ExtendedUser).role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    const { id } = await params;
    await prisma.task.delete({
      where: { id },
    });
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting task:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}