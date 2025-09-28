// app/api/missions/pending-quality-checks/route.ts - NEW API ROUTE
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

    // Get missions that are completed and need quality checks
    const missions = await prisma.mission.findMany({
      where: {
        OR: [
          { status: 'QUALITY_CHECK' },
          { status: 'IN_PROGRESS' }, // Include in-progress missions that might need quality checks
        ]
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            company: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            estimatedTime: true,
            actualTime: true
          }
        },
        qualityChecks: {
          select: {
            id: true,
            type: true,
            status: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            tasks: true,
            qualityChecks: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'desc'
      }
    })

    // Filter missions that actually need quality checks
    const filteredMissions = missions.filter(mission => {
      // Check if all tasks are completed
      const allTasksCompleted = mission.tasks.every(task => 
        task.status === 'COMPLETED' || task.status === 'VALIDATED'
      )

      // Check if mission has pending quality checks
      const hasPendingQualityChecks = mission.qualityChecks.some(qc => 
        qc.status === 'PENDING' || qc.status === 'NEEDS_CORRECTION'
      )

      // Include if mission is in quality check status or has completed tasks but no quality checks yet
      return (
        mission.status === 'QUALITY_CHECK' || 
        (allTasksCompleted && mission.qualityChecks.length === 0) ||
        hasPendingQualityChecks
      )
    })

    return NextResponse.json(filteredMissions)

  } catch (error) {
    console.error('Failed to fetch pending quality check missions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}