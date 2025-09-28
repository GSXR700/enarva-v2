// app/api/missions/[id]/status/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { status, notes } = await request.json()

    if (!status) {
      return new NextResponse('Status is required', { status: 400 })
    }

    // Get current mission
    const currentMission = await prisma.mission.findUnique({
      where: { id },
      include: {
        tasks: true,
        lead: true
      }
    })

    if (!currentMission) {
      return new NextResponse('Mission not found', { status: 404 })
    }

    // Auto-transition to QUALITY_CHECK if all tasks are validated
    let finalStatus = status
    if (status === 'IN_PROGRESS') {
      const allTasksValidated = currentMission.tasks.every(task => task.status === 'VALIDATED')
      if (allTasksValidated && currentMission.tasks.length > 0) {
        finalStatus = 'QUALITY_CHECK'
      }
    }

    const updatedMission = await prisma.$transaction(async (tx) => {
      // Update mission
      const mission = await tx.mission.update({
        where: { id },
        data: {
          status: finalStatus,
          actualEndTime: finalStatus === 'COMPLETED' ? new Date() : null,
          adminNotes: notes || currentMission.adminNotes
        },
        include: {
          lead: true,
          teamLeader: true,
          tasks: true
        }
      })

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'MISSION_STATUS_UPDATED',
          title: `Statut mission mis à jour: ${finalStatus}`,
          description: `Mission ${mission.missionNumber} - Nouveau statut: ${finalStatus}`,
          userId: session.user.id,
          leadId: mission.leadId,
        }
      })

      return mission
    })

    return NextResponse.json(updatedMission)
  } catch (error) {
    console.error('Failed to update mission status:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}