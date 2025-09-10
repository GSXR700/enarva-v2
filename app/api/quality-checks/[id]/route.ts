// app/api/quality-checks/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const qualityCheck = await prisma.qualityCheck.findUnique({
      where: { id },
      include: {
        mission: {
          include: {
            lead: true
          }
        }
      }
    })

    if (!qualityCheck) {
      return new NextResponse('Quality check not found', { status: 404 })
    }

    return NextResponse.json(qualityCheck)
  } catch (error) {
    console.error('Failed to fetch quality check:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const {
      status,
      score,
      notes,
      photos,
      issues,
      corrections
    } = body

    const updateData: any = {}
    if (status) updateData.status = status
    if (score) updateData.score = parseInt(score)
    if (notes !== undefined) updateData.notes = notes
    if (photos !== undefined) updateData.photos = photos
    if (issues !== undefined) updateData.issues = issues
    if (corrections !== undefined) updateData.corrections = corrections

    // If validating, add validation fields
    if (status === 'PASSED' || status === 'FAILED') {
      updateData.validatedBy = session.user.id
      updateData.validatedAt = new Date()
    }

    const qualityCheck = await prisma.qualityCheck.update({
      where: { id },
      data: updateData,
      include: {
        mission: {
          include: {
            lead: true
          }
        }
      }
    })

    return NextResponse.json(qualityCheck)
  } catch (error) {
    console.error('Failed to update quality check:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}