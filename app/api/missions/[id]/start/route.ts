import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id: missionId } = await params
    const user = session.user as any

    // Check if mission exists
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        teamLeader: true,
        team: {
          include: {
            members: {
              where: { userId: user.id }
            }
          }
        }
      }
    })

    if (!mission) {
      return new NextResponse('Mission not found', { status: 404 })
    }

    // Check permissions
    const canStart = 
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      mission.teamLeaderId === user.id ||
      (mission.team?.members && mission.team.members.length > 0)

    if (!canStart) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Check if mission can be started
    if (mission.status !== 'SCHEDULED') {
      return NextResponse.json(
        { error: 'Mission cannot be started. Current status: ' + mission.status },
        { status: 400 }
      )
    }

    // Start the mission
    const updatedMission = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update mission status
      const updated = await tx.mission.update({
        where: { id: missionId },
        data: {
          status: 'IN_PROGRESS',
          actualStartTime: new Date()
        },
        include: {
          lead: true,
          teamLeader: true,
          team: true,
          tasks: true
        }
      })

      // Update assigned tasks to IN_PROGRESS if they are still ASSIGNED
      // Note: Remove startedAt field as it's not in the schema
      await tx.task.updateMany({
        where: {
          missionId: missionId,
          status: 'ASSIGNED'
        },
        data: {
          status: 'IN_PROGRESS'
        }
      })

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'MISSION_STARTED',
          title: 'Mission démarrée',
          description: `Mission ${updated.missionNumber} démarrée`,
          userId: user.id,
          leadId: updated.leadId,
          metadata: {
            missionId: missionId,
            startTime: new Date().toISOString()
          }
        }
      })

      return updated
    })

    return NextResponse.json(updatedMission)
  } catch (error) {
    console.error('Failed to start mission:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}