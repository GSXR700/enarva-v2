// app/api/missions/pending-quality-checks/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get missions with QUALITY_CHECK status and all tasks validated
    const missions = await prisma.mission.findMany({
      where: {
        status: 'QUALITY_CHECK',
        // Only include missions where all tasks are validated
        tasks: {
          every: {
            status: 'VALIDATED'
          }
        }
      },
      include: {
        lead: true,
        teamLeader: true,
        tasks: {
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledDate: 'asc' }
      ]
    })

    return NextResponse.json(missions)
  } catch (error) {
    console.error('Failed to fetch pending quality check missions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}