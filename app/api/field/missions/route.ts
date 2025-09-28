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

    // Build where clause based on user role
    const whereClause: any = {
      scheduledDate: {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    // Filter based on user role
    if (user.role === 'TEAM_LEADER') {
      whereClause.teamLeaderId = user.id
    } else if (user.role === 'AGENT' || user.role === 'TECHNICIAN') {
      // Get user's team memberships
      const teamMemberships = await prisma.teamMember.findMany({
        where: {
          userId: user.id,
          isActive: true
        },
        select: { teamId: true }
      })

      const teamIds = teamMemberships.map((tm: any) => tm.teamId)
      
      if (teamIds.length > 0) {
        whereClause.OR = [
          { teamId: { in: teamIds } },
          { tasks: { some: { assignedTo: { userId: user.id } } } }
        ]
      } else {
        // If user has no team, show tasks directly assigned to them
        whereClause.tasks = { some: { assignedTo: { userId: user.id } } }
      }
    }
    // Admin and Manager see all missions

    const missions = await prisma.mission.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            address: true
          }
        },
        teamLeader: {
          select: {
            name: true
          }
        },
        team: {
          select: {
            name: true,
            members: {
              where: { isActive: true },
              select: {
                user: {
                  select: {
                    name: true,
                    image: true,
                    role: true
                  }
                }
              }
            }
          }
        },
        tasks: {
          include: {
            assignedTo: {
              select: {
                user: {
                  select: {
                    name: true,
                    image: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { scheduledDate: 'asc' }
    })

    return NextResponse.json(missions)
  } catch (error) {
    console.error('Failed to fetch field missions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}