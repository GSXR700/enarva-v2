// app/api/missions/field/route.ts - NEW API ROUTE FOR FIELD MISSIONS
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any

    // Get missions based on user role
    let whereClause: any = {}

    if (user.role === 'TEAM_LEADER') {
      // Team leaders see missions they lead
      whereClause = {
        teamLeaderId: user.id,
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED']
        }
      }
    } else if (user.role === 'TECHNICIAN') {
      // Technicians see missions where they have assigned tasks or are team members
      whereClause = {
        OR: [
          {
            tasks: {
              some: {
                assignedTo: {
                  userId: user.id
                }
              }
            }
          },
          {
            team: {
              members: {
                some: {
                  userId: user.id,
                  isActive: true
                }
              }
            }
          }
        ],
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED']
        }
      }
    } else {
      // Admins and managers see all missions
      whereClause = {
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED']
        }
      }
    }

    const missions = await prisma.mission.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            address: true,
            company: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            image: true,
            role: true
          }
        },
        team: {
          include: {
            members: {
              where: { isActive: true },
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
            }
          }
        },
        tasks: {
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
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        quote: {
          select: {
            id: true,
            finalPrice: true,
            status: true
          }
        }
      },
      orderBy: [
        { scheduledDate: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    // Filter missions for today and upcoming
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const filteredMissions = missions.filter(mission => {
      const missionDate = new Date(mission.scheduledDate)
      missionDate.setHours(0, 0, 0, 0)
      
      // Include today's missions and future missions that are active
      return missionDate >= today || ['IN_PROGRESS', 'QUALITY_CHECK'].includes(mission.status)
    })

    return NextResponse.json(filteredMissions)

  } catch (error) {
    console.error('Failed to fetch field missions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}