import { NextResponse } from 'next/server';
import { PrismaClient, TaskStatus } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          include: {
            user: true,
          },
        },
        mission: {
          include: {
            lead: true,
            fieldReport: true,
          },
        },
      },
    });

    if (!task) {
      return new NextResponse('Task not found', { status: 404 });
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes, actualTime } = body;

    const existingTask = await prisma.task.findUnique({
      where: { id },
      include: { mission: true },
    });

    if (!existingTask) {
      return new NextResponse('Task not found', { status: 404 });
    }

    const updateData: {
      status?: TaskStatus;
      notes?: string;
      actualTime?: number;
      completedAt?: Date;
    } = {};

    if (status) updateData.status = status;
    if (notes) updateData.notes = notes;
    if (actualTime) updateData.actualTime = actualTime;
    if (status === 'COMPLETED' && existingTask.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    // If all tasks for the mission are now completed, update the mission status
    if (status === 'COMPLETED') {
      const missionTasks = await prisma.task.findMany({
        where: { missionId: existingTask.missionId },
      });

      const allTasksCompleted = missionTasks.every(
        (task) => task.status === 'COMPLETED'
      );

      if (allTasksCompleted) {
        await prisma.mission.update({
          where: { id: existingTask.missionId },
          data: { status: 'QUALITY_CHECK', actualEndTime: new Date() },
        });
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
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
  }
}