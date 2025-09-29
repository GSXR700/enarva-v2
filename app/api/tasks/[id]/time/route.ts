// app/api/tasks/[id]/time/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const timeUpdateSchema = z.object({
  estimatedTime: z.number().min(1).max(1440),
  actualTime: z.number().min(1).max(1440).optional().nullable(),
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
    
    console.log('🕒 Task Time Update Request:', { taskId, body })
    
    const validationResult = timeUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors)
      return NextResponse.json(
        { error: 'Invalid time values', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { estimatedTime, actualTime } = validationResult.data

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
        }
      }
    })

    if (!task) {
      console.error('❌ Task not found:', taskId)
      return new NextResponse('Task not found', { status: 404 })
    }

    const user = session.user as any

    const canUpdateTime = 
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      task.mission.teamLeaderId === user.id

    if (!canUpdateTime) {
      console.error('❌ Permission denied for time update:', user.id)
      return new NextResponse('Forbidden - Only team leaders can update task time', { status: 403 })
    }

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          estimatedTime,
          actualTime: actualTime ?? null
        },
        include: {
          assignedTo: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true
                }
              }
            }
          },
          mission: {
            select: {
              id: true,
              missionNumber: true
            }
          }
        }
      })

      await tx.activity.create({
        data: {
          type: 'MISSION_STATUS_UPDATED',
          title: 'Temps de tâche mis à jour',
          description: `Temps estimé de la tâche "${task.title}" mis à jour: ${estimatedTime} minutes`,
          userId: user.id,
          metadata: {
            taskId: taskId,
            oldEstimatedTime: task.estimatedTime,
            newEstimatedTime: estimatedTime,
            actualTime: actualTime ?? null,
            missionId: task.missionId
          }
        }
      })

      return updated
    })

    if (process.env.PUSHER_APP_ID) {
      try {
        const { pusherServer } = await import('@/lib/pusher')
        await pusherServer.trigger('missions-channel', 'task-updated', {
          taskId: updatedTask.id,
          missionId: task.missionId,
          estimatedTime: estimatedTime,
          action: 'time-update',
          updatedAt: new Date()
        })
        console.log('✅ Pusher notification sent for time update')
      } catch (pusherError) {
        console.warn('⚠️ Pusher notification failed:', pusherError)
      }
    }

    console.log('✅ Task time updated successfully')
    return NextResponse.json(updatedTask)

  } catch (error) {
    console.error('❌ Failed to update task time:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update task time', details: errorMessage },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}