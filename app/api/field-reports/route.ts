// app/api/field-reports/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const fieldReports = await prisma.fieldReport.findMany({
      include: {
        mission: {
          include: {
            lead: true
          }
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        submissionDate: 'desc'
      }
    })
    
    return NextResponse.json(fieldReports)
  } catch (error) {
    console.error('Failed to fetch field reports:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const {
      missionId,
      generalObservations,
      clientFeedback,
      issuesEncountered,
      materialsUsed,
      hoursWorked,
      beforePhotos,
      afterPhotos,
      clientSignatureUrl,
      teamLeadSignatureUrl,
      additionalNotes
    } = body

    if (!missionId || !hoursWorked) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const fieldReport = await prisma.fieldReport.create({
      data: {
        missionId,
        submittedById: session.user.id,
        generalObservations,
        clientFeedback,
        issuesEncountered,
        materialsUsed,
        hoursWorked: parseFloat(hoursWorked),
        beforePhotos: beforePhotos || [],
        afterPhotos: afterPhotos || [],
        clientSignatureUrl,
        teamLeadSignatureUrl,
        additionalNotes
      },
      include: {
        mission: {
          include: {
            lead: true
          }
        },
        submittedBy: true
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'MISSION_COMPLETED',
        title: 'Rapport de terrain soumis',
        description: `Rapport de terrain créé pour la mission ${fieldReport.mission.missionNumber}`,
        userId: session.user.id,
        leadId: fieldReport.mission.leadId,
      }
    })

    return NextResponse.json(fieldReport, { status: 201 })
  } catch (error) {
    console.error('Failed to create field report:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}