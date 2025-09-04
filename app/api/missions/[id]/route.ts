// app/api/missions/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET handler to fetch a single mission by its ID
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const mission = await prisma.mission.findUnique({
            where: { id },
            include: { 
                lead: true,
                teamLeader: true,
                teamMembers: { include: { user: true } },
                tasks: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!mission) {
            return new NextResponse('Mission not found', { status: 404 });
        }
        return NextResponse.json(mission);
    } catch (error) {
        console.error(`Failed to fetch mission:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// PATCH handler to update the mission, team, and tasks
export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { teamMemberIds, tasks, ...missionData } = body;
        
        if (missionData.scheduledDate) {
            missionData.scheduledDate = new Date(missionData.scheduledDate);
        }

        const updatedMission = await prisma.$transaction(async (tx) => {
            // 1. Update core mission data and team members
            const mission = await tx.mission.update({
                where: { id },
                data: {
                    ...missionData,
                    teamMembers: {
                        set: teamMemberIds ? teamMemberIds.map((memberId: string) => ({ id: memberId })) : [],
                    },
                },
            });

            // 2. If tasks are provided, replace the existing ones
            if (tasks && Array.isArray(tasks)) {
                // Delete all old tasks for this mission
                await tx.task.deleteMany({ where: { missionId: id } });
                
                // Create the new tasks
                if (tasks.length > 0) {
                    await tx.task.createMany({
                        data: tasks.map((task: any) => ({
                            title: task.title,
                            category: task.category,
                            status: task.status || 'ASSIGNED',
                            estimatedTime: task.estimatedTime || 0,
                            missionId: id,
                        })),
                    });
                }
            }
            return mission;
        });

        return NextResponse.json(updatedMission);
    } catch (error) {
        console.error(`Failed to update mission:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE handler to remove a mission
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.$transaction([
            prisma.task.deleteMany({ where: { missionId: id } }),
            prisma.expense.updateMany({ where: { missionId: id }, data: { missionId: null } }),
            prisma.mission.delete({ where: { id } }),
        ]);

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`Failed to delete mission:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}