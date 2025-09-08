// app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const task = await prisma.task.findUnique({ 
            where: { id },
            include: {
                mission: {
                    include: {
                        lead: true
                    }
                },
                assignedTo: true
            }
        });

        if (!task) {
            return new NextResponse('Task not found', { status: 404 });
        }
        return NextResponse.json(task);
    } catch (error) {
        console.error(`Failed to fetch task:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }
        
        const user = session.user as ExtendedUser;
        if (!user.id) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        
        console.log('🔧 Task update request:', { taskId: id, updates: body });

        const currentTask = await prisma.task.findUnique({
            where: { id },
            include: {
                mission: {
                    include: {
                        tasks: true,
                        lead: true
                    }
                }
            }
        });

        if (!currentTask) {
            return new NextResponse('Task not found', { status: 404 });
        }

        const updateData: any = {
            ...body,
            updatedAt: new Date()
        };

        if (body.status) {
            switch (body.status) {
                case 'IN_PROGRESS':
                    if (!currentTask.startedAt) {
                        updateData.startedAt = new Date();
                    }
                    break;

                case 'COMPLETED':
                    updateData.completedAt = new Date();
                    
                    if (body.beforePhotos || body.afterPhotos) {
                        updateData.beforePhotos = body.beforePhotos || currentTask.beforePhotos;
                        updateData.afterPhotos = body.afterPhotos || currentTask.afterPhotos;
                    }
                    
                    if (body.clientApproved !== undefined) {
                        updateData.clientApproved = Boolean(body.clientApproved);
                    }
                    break;

                case 'VALIDATED':
                    updateData.validatedAt = new Date();
                    updateData.validatedBy = user.id;
                    break;
            }
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                mission: {
                    include: {
                        lead: true,
                        tasks: true
                    }
                },
                assignedTo: true
            }
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error(`Failed to update task:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        await prisma.task.delete({
            where: { id },
        });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`Failed to delete task:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}