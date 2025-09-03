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
                teamMembers: {
                  include: {
                    user: true
                  }
                },
                tasks: {
                    include: {
                        assignedTo: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                }
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

// PATCH handler to update the mission with a report, new status, or team members
export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { teamMemberIds, ...missionData } = body;

        // Ensure that if scheduledDate is passed, it's a valid Date
        if (missionData.scheduledDate) {
            missionData.scheduledDate = new Date(missionData.scheduledDate);
        }

        // Handle team member updates
        if (teamMemberIds && Array.isArray(teamMemberIds)) {
            missionData.teamMembers = {
                set: teamMemberIds.map((memberId: string) => ({ id: memberId }))
            };
        }

        const updatedMission = await prisma.mission.update({
            where: { id },
            data: missionData,
            include: {
                lead: true,
                teamLeader: true,
                teamMembers: { include: { user: true }},
                tasks: true
            }
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

        // Use a transaction to ensure all related data is deleted
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