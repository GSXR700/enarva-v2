// app/api/tasks/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

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
    
    console.log('🔧 Task Status Update Request:', { taskId, body, userId: session.user.id })
    
    const validationResult = statusUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.errors)
      return NextResponse.json(
        { error: 'Invalid status', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { status } = validationResult.data

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        mission: {
          include: {
            teamLeader: {
              select: { id: true, name: true }
            },
            team: {
              include: {
                members: {
                  where: { isActive: true },
                  include: {
                    user: {
                      select: { id: true, name: true, role: true }
                    }
                  }
                }
              }
            }
          }
        },
        assignedTo: {
          include: {
            user: {
              select: { id: true, name: true, role: true }
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
    
    console.log('🔍 Authorization Check:', {
      userRole: user.role,
      userId: user.id,
      missionTeamLeader: task.mission.teamLeaderId,
      taskAssignedTo: task.assignedTo?.userId,
      teamMembers: task.mission.team?.members?.map(m => ({ id: m.user.id, name: m.user.name }))
    })

    const isAdmin = user.role === 'ADMIN' || user.role === 'MANAGER'
    const isTeamLeader = task.mission.teamLeaderId === user.id
    const isAssignedUser = task.assignedTo?.userId === user.id
    const isTeamMember = task.mission.team?.members?.some(member => member.user.id === user.id)

    const canUpdate = isAdmin || isTeamLeader || isAssignedUser || isTeamMember

    console.log('🔐 Permission Results:', {
      isAdmin,
      isTeamLeader, 
      isAssignedUser,
      isTeamMember,
      canUpdate
    })

    if (!canUpdate) {
      console.error('❌ Permission denied for user:', user.id)
      return new NextResponse('Forbidden - You cannot update this task', { status: 403 })
    }

    const updateData: any = { status }
    
    if (status === 'IN_PROGRESS' && task.status === 'ASSIGNED') {
      updateData.startedAt = new Date()
    }

    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date()
      if (!task.actualTime && task.estimatedTime) {
        updateData.actualTime = task.estimatedTime
      }
    }

    console.log('🔧 Updating task with data:', updateData)

    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.task.update({
        where: { id: taskId },
        data: updateData,
        include: {
          assignedTo: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  image: true,
                  role: true
                }
              }
            }
          },
          mission: {
            select: {
              id: true,
              missionNumber: true,
              status: true
            }
          }
        }
      })

      await tx.activity.create({
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

      if (status === 'COMPLETED') {
        const allMissionTasks = await tx.task.findMany({
          where: { missionId: task.missionId }
        })

        const allCompleted = allMissionTasks.every(t => 
          t.id === taskId ? true : (t.status === 'COMPLETED' || t.status === 'VALIDATED')
        )

        if (allCompleted && task.mission.status === 'IN_PROGRESS') {
          await tx.mission.update({
            where: { id: task.missionId },
            data: { 
              status: 'QUALITY_CHECK',
              actualEndTime: new Date()
            }
          })
          console.log('🎉 All tasks completed - Mission moved to QUALITY_CHECK')
        }
      }

      return updated
    })

    if (process.env.PUSHER_APP_ID) {
      try {
        const { pusherServer } = await import('@/lib/pusher')
        await pusherServer.trigger('missions-channel', 'task-updated', {
          taskId: updatedTask.id,
          missionId: task.missionId,
          status: updatedTask.status,
          assignedTo: updatedTask.assignedTo?.user.id,
          updatedAt: new Date()
        })
        console.log('✅ Pusher notification sent')
      } catch (pusherError) {
        console.warn('⚠️ Pusher notification failed:', pusherError)
      }
    }

    console.log('✅ Task updated successfully:', updatedTask.id)
    return NextResponse.json(updatedTask)

  } catch (error) {
    console.error('❌ Task status update failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to update task status', details: errorMessage },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}