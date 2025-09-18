// app/api/missions/[id]/route.ts - Consolidated and corrected
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, MissionStatus, Priority } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { z } from 'zod';

const prisma = new PrismaClient();

const missionUpdateSchema = z.object({
  scheduledDate: z.string().datetime().optional(),
  estimatedDuration: z.number().min(0.5).max(24).optional(),
  address: z.string().min(1).optional(),
  coordinates: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(MissionStatus).optional(),
  teamLeaderId: z.string().optional(),
  teamId: z.string().optional(),
  actualStartTime: z.string().datetime().optional().nullable(),
  actualEndTime: z.string().datetime().optional().nullable(),
  clientValidated: z.boolean().optional(),
  clientFeedback: z.string().optional().nullable(),
  clientRating: z.number().min(1).max(5).optional().nullable(),
}).passthrough();

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

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        lead: true,
        quote: true,
        teamLeader: { select: { id: true, name: true, email: true, image: true } },
        team: { include: { members: { include: { user: true } } } },
        tasks: true,
        expenses: true,
        qualityChecks: true,
        fieldReport: true,
      },
    });

    if (!mission) {
      return new NextResponse('Mission not found', { status: 404 });
    }

    return NextResponse.json(mission);
  } catch (error) {
    console.error('Failed to fetch mission:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ExtendedUser;
    if (!user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!['ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const validatedData = missionUpdateSchema.parse(body);

    const updatedMission = await prisma.$transaction(async (tx) => {
      const existingMission = await tx.mission.findUnique({
        where: { id },
      });

      if (!existingMission) {
        throw new Error('Mission not found');
      }

      if (user.role === 'TEAM_LEADER' && existingMission.teamLeaderId !== user.id) {
        throw new Error('Not authorized to update this mission');
      }

      if (validatedData.teamLeaderId && validatedData.teamLeaderId !== existingMission.teamLeaderId) {
        const newTeamLeader = await tx.user.findUnique({
          where: { id: validatedData.teamLeaderId },
          include: { teamMemberships: { where: { isActive: true } } }
        });
        if (!newTeamLeader || newTeamLeader.role !== 'TEAM_LEADER' || newTeamLeader.teamMemberships.length === 0) {
          throw new Error('Invalid or inactive team leader specified');
        }
      }

      const dataToUpdate: any = {};
      if (validatedData.scheduledDate) dataToUpdate.scheduledDate = new Date(validatedData.scheduledDate);
      if (validatedData.estimatedDuration) dataToUpdate.estimatedDuration = validatedData.estimatedDuration;
      if (validatedData.address) dataToUpdate.address = validatedData.address;
      if (validatedData.coordinates) dataToUpdate.coordinates = validatedData.coordinates;
      if (validatedData.accessNotes) dataToUpdate.accessNotes = validatedData.accessNotes;
      if (validatedData.priority) dataToUpdate.priority = validatedData.priority;
      if (validatedData.status) dataToUpdate.status = validatedData.status;
      if (validatedData.teamLeaderId) dataToUpdate.teamLeaderId = validatedData.teamLeaderId;
      if (validatedData.teamId) dataToUpdate.teamId = validatedData.teamId;
      if (validatedData.actualStartTime) dataToUpdate.actualStartTime = new Date(validatedData.actualStartTime);
      if (validatedData.actualEndTime) dataToUpdate.actualEndTime = new Date(validatedData.actualEndTime);
      if (validatedData.clientValidated) dataToUpdate.clientValidated = validatedData.clientValidated;
      if (validatedData.clientFeedback) dataToUpdate.clientFeedback = validatedData.clientFeedback;
      if (validatedData.clientRating) dataToUpdate.clientRating = validatedData.clientRating;

      const updated = await tx.mission.update({
        where: { id },
        data: dataToUpdate,
        include: {
          lead: true,
          quote: true,
          teamLeader: true,
          team: { include: { members: { where: { isActive: true }, include: { user: true } } } },
          tasks: true
        }
      });

      if (validatedData.status && validatedData.status !== existingMission.status) {
        await tx.activity.create({
          data: {
            type: 'MISSION_STATUS_UPDATED',
            title: 'Statut de mission mis à jour',
            description: `Mission ${existingMission.missionNumber} - statut changé de ${existingMission.status} à ${validatedData.status}`,
            userId: user.id,
            leadId: existingMission.leadId,
            metadata: { missionId: existingMission.id, oldStatus: existingMission.status, newStatus: validatedData.status }
          }
        });
      }

      return updated;
    });

    return NextResponse.json(updatedMission);

  } catch (error) {
    if (error instanceof z.ZodError) {
        return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Failed to update mission:', error);
    if (errorMessage.includes('Not found')) {
      return new NextResponse(errorMessage, { status: 404 });
    }
    if (errorMessage.includes('Not authorized')) {
      return new NextResponse(errorMessage, { status: 403 });
    }
    return NextResponse.json({ error: 'Failed to update mission', details: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as ExtendedUser;
    if (!user?.id || user.role !== 'ADMIN') {
      return new NextResponse('Forbidden - Admin access required', { status: 403 });
    }
    const { id } = await params;

    await prisma.$transaction(async (tx) => {
      const mission = await tx.mission.findUnique({
        where: { id },
      });

      if (!mission) {
        throw new Error('Mission not found');
      }

      // Cascade delete related data
      await tx.task.deleteMany({ where: { missionId: id } });
      await tx.qualityCheck.deleteMany({ where: { missionId: id } });
      await tx.inventoryUsage.deleteMany({ where: { missionId: id } });
      await tx.expense.deleteMany({ where: { missionId: id } });
      const conversation = await tx.conversation.findUnique({ where: { missionId: id } });
      if (conversation) {
        await tx.message.deleteMany({ where: { conversationId: conversation.id } });
        await tx.conversation.delete({ where: { missionId: id } });
      }
      await tx.fieldReport.deleteMany({ where: { missionId: id } });
      await tx.invoice.deleteMany({ where: { missionId: id } });
      
      // Finally delete the mission
      await tx.mission.delete({ where: { id } });

      // Log the deletion
      await tx.activity.create({
        data: {
          type: 'SYSTEM_MAINTENANCE',
          title: 'Mission supprimée',
          description: `Mission ${mission.missionNumber} a été supprimée par ${user.name}`,
          userId: user.id,
          leadId: mission.leadId,
          metadata: { deletedMissionId: id, missionNumber: mission.missionNumber, deletedBy: user.name }
        }
      });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Failed to delete mission:', error);
     if (errorMessage.includes('not found')) {
      return new NextResponse(errorMessage, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete mission', details: errorMessage }, { status: 500 });
  }
}