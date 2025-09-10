// app/api/quality-checks/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const qualityChecks = await prisma.qualityCheck.findMany({
      include: {
        mission: {
          include: {
            lead: true
          }
        }
      },
      orderBy: {
        checkedAt: 'desc'
      }
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
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const {
      missionId,
      type,
      status,
      score,
      notes,
      photos,
      issues,
      corrections
    } = body

    if (!missionId || !type) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const qualityCheck = await prisma.qualityCheck.create({
      data: {
        missionId,
        type,
        status: status || 'PENDING',
        score: score ? parseInt(score) : null,
        notes,
        photos: photos || null,
        issues: issues || null,
        corrections: corrections || null,
        checkedBy: session.user.id
      },
      include: {
        mission: {
          include: {
            lead: true
          }
        }
      }
    })

    return NextResponse.json(qualityCheck, { status: 201 })
  } catch (error) {
    console.error('Failed to create quality check:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}