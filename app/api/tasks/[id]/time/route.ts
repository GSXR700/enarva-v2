// app/api/tasks/[id]/time/route.ts - NEW API ROUTE FOR TIME UPDATES
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const timeUpdateSchema = z.object({
  estimatedTime: z.number().min(1).max(1440), // 1 minute to 24 hours
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
    
    const validationResult = timeUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid time values', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { estimatedTime, actualTime } = validationResult.data

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
        }
      }
    })

    if (!task) {
      return new NextResponse('Task not found', { status: 404 })
    }

    const user = session.user as any

    // Check permissions - only team leaders and admins can update time
    const canUpdateTime = 
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      task.mission.teamLeaderId === user.id

    if (!canUpdateTime) {
      return new NextResponse('Forbidden - Only team leaders can update task time', { status: 403 })
    }

    // Update task time
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: {
          estimatedTime,
          actualTime: actualTime ?? null // Fix: Convert undefined to null
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

      // Create activity log
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

    return NextResponse.json(updatedTask)

  } catch (error) {
    console.error('Failed to update task time:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}