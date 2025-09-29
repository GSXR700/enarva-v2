// app/api/tasks/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const taskUpdateSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'REJECTED']).optional(),
  notes: z.string().optional().nullable(),
  actualTime: z.number().min(0).optional().nullable(),
  estimatedTime: z.number().min(0).optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
  validatedAt: z.string().datetime().optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  title: z.string().optional(),
  description: z.string().optional().nullable(),
  category: z.string().optional(),
  type: z.string().optional()
});

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

    console.log('🔧 Task Update Request:', { taskId: id, body, userId: user.id, userRole: user.role });

    const validationResult = taskUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

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

    const isAuthorized = (
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      existingTask.mission.teamLeaderId === user.id ||
      (user.role === 'TECHNICIAN' && existingTask.assignedToId && await isUserAssignedToTask(user.id, existingTask.assignedToId))
    );

    if (!isAuthorized) {
      console.error('❌ Authorization failed:', {
        userRole: user.role,
        userId: user.id,
        missionTeamLeader: existingTask.mission.teamLeaderId,
        taskAssignedTo: existingTask.assignedToId
      });
      return new NextResponse('Forbidden - You can only update tasks assigned to you or your team', { status: 403 });
    }

    const updateData: any = {};

    if (body.status) {
      updateData.status = body.status;
      
      if (body.status === 'IN_PROGRESS' && existingTask.status === 'ASSIGNED') {
        updateData.startedAt = new Date();
      }
      
      if (body.status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
        updateData.completedAt = new Date();
      } else if (body.status === 'VALIDATED' && existingTask.status !== 'VALIDATED') {
        updateData.validatedAt = new Date();
      }
    }

    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.actualTime !== undefined) updateData.actualTime = body.actualTime;
    if (body.estimatedTime !== undefined) updateData.estimatedTime = body.estimatedTime;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.type !== undefined) updateData.type = body.type;
    
    if (body.completedAt !== undefined) {
      updateData.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    }
    if (body.validatedAt !== undefined) {
      updateData.validatedAt = body.validatedAt ? new Date(body.validatedAt) : null;
    }
    if (body.startedAt !== undefined) {
      updateData.startedAt = body.startedAt ? new Date(body.startedAt) : null;
    }

    if (body.assignedToId !== undefined) {
      updateData.assignedToId = body.assignedToId;
    }

    console.log('🔧 Final update data:', updateData);

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
        console.log('🎉 All tasks completed - Mission moved to QUALITY_CHECK');
      }
    }

    if (body.assignedToId !== undefined && process.env.PUSHER_APP_ID) {
      try {
        const { pusherServer } = await import('@/lib/pusher')
        await pusherServer.trigger('missions-channel', 'task-updated', {
          taskId: updatedTask.id,
          missionId: existingTask.mission.id,
          assignedTo: body.assignedToId,
          action: 'assignment',
          updatedAt: new Date()
        })
        console.log('✅ Pusher notification sent for assignment')
      } catch (pusherError) {
        console.warn('⚠️ Pusher notification failed:', pusherError)
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

async function isUserAssignedToTask(userId: string, taskAssignedToId: string): Promise<boolean> {
  try {
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: taskAssignedToId },
      select: { userId: true }
    });
    return teamMember?.userId === userId;
  } catch (error) {
    console.error('Error checking task assignment:', error);
    return false;
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