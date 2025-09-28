// app/api/quality-checks/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient, MissionStatus } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const qualityChecks = await prisma.qualityCheck.findMany({
      include: {
        mission: {
          include: {
            lead: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(qualityChecks)
  } catch (error) {
    console.error('Failed to fetch quality checks:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const {
      missionId,
      type,
      status,
      score,
      notes,
      photos,
      issues
    } = await request.json()

    if (!missionId || !type || !status) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create quality check
      const qualityCheck = await tx.qualityCheck.create({
        data: {
          missionId,
          type,
          status,
          score,
          notes,
          photos: photos || [],
          issues,
          checkedBy: session.user.id,
          checkedAt: new Date(),
          validatedAt: status === 'PASSED' ? new Date() : null
        },
        include: {
          mission: {
            include: {
              lead: true
            }
          }
        }
      })

      // Update mission status based on quality check result
      let newMissionStatus: MissionStatus = 'QUALITY_CHECK'
      
      if (status === 'PASSED') {
        newMissionStatus = 'CLIENT_VALIDATION'
      } else if (status === 'FAILED' || status === 'NEEDS_CORRECTION') {
        newMissionStatus = 'IN_PROGRESS'
      }

      await tx.mission.update({
        where: { id: missionId },
        data: {
          status: newMissionStatus,
          qualityScore: score,
          adminValidated: status === 'PASSED',
          adminValidatedBy: session.user.id,
          adminValidatedAt: status === 'PASSED' ? new Date() : null,
          adminNotes: notes
        }
      })

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'QUALITY_ISSUE',
          title: `Contrôle qualité ${status === 'PASSED' ? 'approuvé' : 'effectué'}`,
          description: `Contrôle qualité ${type} pour la mission ${qualityCheck.mission.missionNumber}`,
          userId: session.user.id,
          leadId: qualityCheck.mission.leadId,
        }
      })

      return qualityCheck
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create quality check:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}