import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const missionUpdateSchema = z.object({
  name: z.string().min(1, 'Mission name is required'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().optional(),
  teamId: z.string().optional().nullable(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    category: z.string(),
    type: z.string(),
    status: z.string().optional(),
    estimatedTime: z.number().optional(),
  })).optional(),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const mission = await prisma.mission.findUnique({
      where: { id: params.id },
      include: {
        tasks: true,
        team: {
            include: {
                members: {
                    include: {
                        user: true
                    }
                }
            }
        },
        quote: {
            include: {
                lead: true
            }
        }
      },
    });

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    return NextResponse.json(mission);
  } catch (error) {
    console.error('Failed to retrieve mission:', error);
    return NextResponse.json({ error: 'Failed to retrieve mission' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, startDate, endDate, status, teamId, tasks = [] } = missionUpdateSchema.parse(body);

        const updatedMission = await prisma.$transaction(async (tx) => {
            const missionUpdateData: any = {
                name,
                status,
            };

            if (startDate) missionUpdateData.startDate = new Date(startDate);
            if (endDate) missionUpdateData.endDate = new Date(endDate);
            
            if (teamId) {
                missionUpdateData.team = { connect: { id: teamId } };
            } else {
                const existingMission = await tx.mission.findUnique({ where: { id: params.id }, select: { teamId: true } });
                if (existingMission?.teamId) {
                    missionUpdateData.team = { disconnect: true };
                }
            }

            const updatedMission = await tx.mission.update({
                where: { id: params.id },
                data: missionUpdateData,
            });

            await tx.task.deleteMany({
                where: { missionId: params.id },
            });

            if (tasks.length > 0) {
                await tx.task.createMany({
                    data: tasks.map((task: any) => ({
                        title: task.title,
                        type: task.type,
                        category: task.category,
                        status: task.status || 'ASSIGNED',
                        estimatedTime: task.estimatedTime,
                        missionId: updatedMission.id,
                    })),
                });
            }

            return updatedMission;
        });

        return NextResponse.json(updatedMission);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error('Failed to update mission:', error);
        return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 });
    }
}


export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await prisma.mission.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ message: 'Mission deleted successfully' }, { status: 200 });
    } catch (error) {
        console.error('Failed to delete mission:', error);
        return NextResponse.json({ error: 'Failed to delete mission' }, { status: 500 });
    }
}