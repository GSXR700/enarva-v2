// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/api/missions/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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
                teamLeader: true,
                teamMembers: { include: { user: true } },
                tasks: { orderBy: { createdAt: 'asc' } }
            }
        });
        if (!mission) return new NextResponse('Mission not found', { status: 404 });
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
        const { teamMemberIds, tasks, ...missionData } = body;
        
        const dataToUpdate: any = { ...missionData };
        if (missionData.scheduledDate) dataToUpdate.scheduledDate = new Date(missionData.scheduledDate);
        if (missionData.estimatedDuration) dataToUpdate.estimatedDuration = parseInt(missionData.estimatedDuration, 10);
        if (missionData.clientRating) dataToUpdate.clientRating = parseInt(missionData.clientRating, 10) || null;
        if (missionData.clientValidated !== undefined) dataToUpdate.clientValidated = Boolean(missionData.clientValidated);
        if (missionData.invoiceGenerated !== undefined) dataToUpdate.invoiceGenerated = Boolean(missionData.invoiceGenerated);

        if (missionData.teamLeaderId) {
            dataToUpdate.teamLeader = { connect: { id: missionData.teamLeaderId } };
        } else if (missionData.teamLeaderId === null) {
            dataToUpdate.teamLeader = { disconnect: true };
        }
        
        if (teamMemberIds && Array.isArray(teamMemberIds)) {
            dataToUpdate.teamMembers = { set: teamMemberIds.map((memberId: string) => ({ id: memberId })) };
        }

        const updatedMission = await prisma.$transaction(async (tx) => {
            const mission = await tx.mission.update({ where: { id }, data: dataToUpdate });
            if (tasks && Array.isArray(tasks)) {
                await tx.task.deleteMany({ where: { missionId: id } });
                if (tasks.length > 0) {
                    await tx.task.createMany({
                        data: tasks.map((task: any) => ({
                            ...task,
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