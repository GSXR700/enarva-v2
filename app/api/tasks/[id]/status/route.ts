import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const statusUpdateSchema = z.object({
  status: z.enum(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'VALIDATED', 'REJECTED'])
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id: taskId } = await params
    const body = await request.json()
    
    const validationResult = statusUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid status', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { status } = validationResult.data

    // Check if task exists and user has permission
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        mission: {
          include: {
            teamLeader: true,
            team: {
              include: {
                members: {
                  where: { userId: session.user.id }
                }
              }
            }
          }
        },
        assignedTo: {
          include: {
            user: true
          }
        }
      }
    })

    if (!task) {
      return new NextResponse('Task not found', { status: 404 })
    }

    const user = session.user as any

    // Check permissions
    const canUpdate = 
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      task.mission.teamLeaderId === user.id ||
      task.assignedTo?.userId === user.id ||
      (task.mission.team?.members?.length ?? 0) > 0

    if (!canUpdate) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Update task with timestamp for completed status
    const updateData: any = { status }
    
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date()
      updateData.actualTime = task.estimatedTime // Could be enhanced to track actual time
    }

    if (status === 'IN_PROGRESS' && task.status === 'ASSIGNED') {
      updateData.startedAt = new Date()
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        assignedTo: {
          include: {
            user: {
              select: {
                name: true,
                image: true
              }
            }
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'MISSION_STATUS_UPDATED',
        title: 'Statut de tâche mis à jour',
        description: `Tâche "${task.title}" mise à jour vers ${status}`,
        userId: user.id,
        metadata: {
          taskId: taskId,
          oldStatus: task.status,
          newStatus: status,
          missionId: task.missionId
        }
      }
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Failed to update task status:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}