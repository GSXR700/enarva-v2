// app/api/tasks/[id]/status/route.ts - FIXED VERSION
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

    // Check if task exists and get full context
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

    // Enhanced permission check - FIXED
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

    // Update task with proper timestamps
    const updateData: any = { status }
    
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date()
      if (task.estimatedTime) {
        updateData.actualTime = task.estimatedTime // Could be enhanced to track real time
      }
    }

    if (status === 'IN_PROGRESS' && task.status === 'ASSIGNED') {
      updateData.startedAt = new Date()
    }

    console.log('🔧 Updating task with data:', updateData)

    const updatedTask = await prisma.$transaction(async (tx) => {
      // Update the task
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

      // Create activity log
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

      // Check if all tasks in mission are completed to auto-promote mission
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