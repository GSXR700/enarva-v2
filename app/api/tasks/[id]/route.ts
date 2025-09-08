// app/api/tasks/[id]/route.ts - ENHANCED WITH COMPLETE WORKFLOW
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

        // Get current task
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

        // Prepare update data
        const updateData: any = {
            ...body,
            updatedAt: new Date()
        };

        // Handle status-specific logic
        if (body.status) {
            switch (body.status) {
                case 'IN_PROGRESS':
                    if (!currentTask.startedAt) {
                        updateData.startedAt = new Date();
                    }
                    break;

                case 'COMPLETED':
                    updateData.completedAt = new Date();
                    
                    // Handle photo uploads
                    if (body.beforePhotos || body.afterPhotos) {
                        updateData.beforePhotos = body.beforePhotos || currentTask.beforePhotos;
                        updateData.afterPhotos = body.afterPhotos || currentTask.afterPhotos;
                    }
                    
                    // Handle client approval
                    if (body.clientApproved !== undefined) {
                        updateData.clientApproved = body.clientApproved;
                        updateData.clientFeedback = body.clientFeedback || null;
                    }
                    break;

                case 'VALIDATED':
                    updateData.validatedBy = user.id;
                    updateData.validatedAt = new Date();
                    break;

                case 'REJECTED':
                    updateData.validatedBy = user.id;
                    updateData.validatedAt = new Date();
                    // Reset completion data when rejected
                    updateData.completedAt = null;
                    updateData.clientApproved = false;
                    updateData.clientFeedback = null;
                    break;
            }
        }

        // Update the task
        const updatedTask = await prisma.task.update({
            where: { id },
            data: updateData,
            include: {
                mission: {
                    include: {
                        tasks: true,
                        lead: true
                    }
                },
                assignedTo: true
            }
        });

        console.log('✅ Task updated successfully:', updatedTask.status);

        // Check if mission status should be updated
        await updateMissionStatusIfNeeded(currentTask.missionId);

        // Create activity log
        await prisma.activity.create({
            data: {
                type: 'MISSION_STARTED', // You might want to add more specific activity types
                title: `Tâche ${body.status === 'COMPLETED' ? 'terminée' : 'mise à jour'}`,
                description: `Tâche "${currentTask.title}" - ${body.status}`,
                userId: user.id,
                leadId: currentTask.mission.leadId,
            },
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error(`Failed to update task:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// Helper function to update mission status based on task progress
async function updateMissionStatusIfNeeded(missionId: string) {
    try {
        const mission = await prisma.mission.findUnique({
            where: { id: missionId },
            include: { tasks: true }
        });

        if (!mission) return;

        const tasks = mission.tasks;
        const totalTasks = tasks.length;
        
        if (totalTasks === 0) return;

        const validatedTasks = tasks.filter(t => t.status === 'VALIDATED').length;
        const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'VALIDATED').length;
        const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;

        let newStatus = mission.status;

        // Auto-update mission status based on task progress
        if (mission.status === 'SCHEDULED' && inProgressTasks > 0) {
            newStatus = 'IN_PROGRESS';
        } else if (mission.status === 'IN_PROGRESS' && completedTasks === totalTasks) {
            // All tasks completed, ready for quality check
            newStatus = 'QUALITY_CHECK';
        } else if (mission.status === 'QUALITY_CHECK' && validatedTasks === totalTasks) {
            // All tasks validated, ready for client validation
            newStatus = 'CLIENT_VALIDATION';
        }

        // Update mission status if it changed
        if (newStatus !== mission.status) {
            await prisma.mission.update({
                where: { id: missionId },
                data: { 
                    status: newStatus,
                    updatedAt: new Date()
                }
            });

            console.log(`✅ Mission ${missionId} status auto-updated: ${mission.status} → ${newStatus}`);
        }
    } catch (error) {
        console.error('Failed to update mission status:', error);
    }
}