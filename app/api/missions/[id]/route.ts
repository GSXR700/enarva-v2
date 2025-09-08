// app/api/missions/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

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
                quote: true,
                teamLeader: true,
                teamMembers: true,
                tasks: {
                    include: {
                        assignedTo: true
                    },
                    orderBy: { createdAt: 'asc' }
                },
                qualityChecks: true,
                inventoryUsed: {
                    include: {
                        inventory: true
                    }
                },
                conversation: {
                    include: {
                        messages: {
                            include: {
                                sender: true
                            },
                            orderBy: { createdAt: 'desc' },
                            take: 10
                        }
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

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        const { 
            missionNumber, status, priority, type, scheduledDate, estimatedDuration,
            address, coordinates, accessNotes, clientFeedback, clientRating,
            clientValidated, invoiceGenerated, teamLeaderId, teamMemberIds, tasks
        } = body;

        const dataToUpdate: any = {};

        if (missionNumber) dataToUpdate.missionNumber = missionNumber;
        if (status) dataToUpdate.status = status;
        if (priority) dataToUpdate.priority = priority;
        if (type) dataToUpdate.type = type;
        if (scheduledDate) dataToUpdate.scheduledDate = new Date(scheduledDate);
        if (estimatedDuration !== undefined) dataToUpdate.estimatedDuration = parseInt(estimatedDuration, 10);
        if (address) dataToUpdate.address = address;
        if (accessNotes !== undefined) dataToUpdate.accessNotes = accessNotes;
        if (coordinates !== undefined) dataToUpdate.coordinates = coordinates;
        if (clientFeedback !== undefined) dataToUpdate.clientFeedback = clientFeedback;
        if (clientRating !== undefined) dataToUpdate.clientRating = parseInt(clientRating, 10) || null;
        if (clientValidated !== undefined) dataToUpdate.clientValidated = Boolean(clientValidated);
        if (invoiceGenerated !== undefined) dataToUpdate.invoiceGenerated = Boolean(invoiceGenerated);

        if (teamLeaderId) {
            dataToUpdate.teamLeader = { connect: { id: teamLeaderId } };
        } else if (teamLeaderId === null) {
            dataToUpdate.teamLeader = { disconnect: true };
        }
        
        if (teamMemberIds && Array.isArray(teamMemberIds)) {
            dataToUpdate.teamMembers = { set: teamMemberIds.map((memberId: string) => ({ id: memberId })) };
        }

        const updatedMission = await prisma.$transaction(async (tx) => {
            const mission = await tx.mission.update({
                where: { id },
                data: dataToUpdate,
            });

            if (tasks && Array.isArray(tasks)) {
                await tx.task.deleteMany({ where: { missionId: id } });
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