import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    // Base filters for user role
    const missionFilter: any = {}
    const taskFilter: any = {}

    if (user.role === 'TEAM_LEADER') {
      missionFilter.teamLeaderId = user.id
      taskFilter.mission = { teamLeaderId: user.id }
    } else if (user.role === 'AGENT' || user.role === 'TECHNICIAN') {
      const teamMemberships = await prisma.teamMember.findMany({
        where: { userId: user.id, isActive: true },
        select: { teamId: true }
      })

      const teamIds = teamMemberships.map((tm: { teamId: string }) => tm.teamId)
      
      if (teamIds.length > 0) {
        missionFilter.OR = [
          { teamId: { in: teamIds } },
          { tasks: { some: { assignedTo: { userId: user.id } } } }
        ]
        taskFilter.OR = [
          { mission: { teamId: { in: teamIds } } },
          { assignedTo: { userId: user.id } }
        ]
      } else {
        missionFilter.tasks = { some: { assignedTo: { userId: user.id } } }
        taskFilter.assignedTo = { userId: user.id }
      }
    }

    // Get stats
    const [
      activeMissions,
      completedToday,
      pendingTasks,
      totalTasksToday,
      completedTasksToday
    ] = await Promise.all([
      // Active missions count
      prisma.mission.count({
        where: {
          ...missionFilter,
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK'] }
        }
      }),

      // Completed missions today
      prisma.mission.count({
        where: {
          ...missionFilter,
          status: 'COMPLETED',
          updatedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),

      // Pending tasks
      prisma.task.count({
        where: {
          ...taskFilter,
          status: { in: ['ASSIGNED', 'IN_PROGRESS'] }
        }
      }),

      // Total tasks today (for efficiency calculation)
      prisma.task.count({
        where: {
          ...taskFilter,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      }),

      // Completed tasks today (for efficiency calculation)
      prisma.task.count({
        where: {
          ...taskFilter,
          status: 'COMPLETED',
          completedAt: {
            gte: startOfDay,
            lte: endOfDay
          }
        }
      })
    ])

    // Calculate team efficiency
    const teamEfficiency = totalTasksToday > 0 
      ? Math.round((completedTasksToday / totalTasksToday) * 100)
      : 0

    const stats = {
      activeMissions,
      completedToday,
      pendingTasks,
      teamEfficiency
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch field stats:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}