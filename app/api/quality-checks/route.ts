// app/api/quality-checks/route.ts - COMPLETE QUALITY CHECKS API
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const createQualityCheckSchema = z.object({
  missionId: z.string().min(1, 'Mission ID is required'),
  type: z.enum(['TEAM_LEADER_CHECK', 'FINAL_INSPECTION', 'CLIENT_WALKTHROUGH']),
  status: z.enum(['PENDING', 'PASSED', 'FAILED', 'NEEDS_CORRECTION']).default('PENDING'),
  score: z.number().min(1).max(5).optional().nullable().transform(val => val ?? null),
  notes: z.string().max(2000).optional().nullable().transform(val => val || null),
  photos: z.array(z.string()).default([]),
  issues: z.any().optional().nullable().transform(val => val ?? null),
  corrections: z.any().optional().nullable().transform(val => val ?? null),
  followUpRequired: z.boolean().default(false),
  followUpDate: z.string().optional().nullable().transform(val => val ? new Date(val) : null),
  clientNotified: z.boolean().default(false)
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = {}
    if (status && status !== 'all') where.status = status
    if (type && type !== 'all') where.type = type

    const qualityChecks = await prisma.qualityCheck.findMany({
      where,
      include: {
        mission: {
          include: {
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true
              }
            }
          }
        },
        checkedByUser: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    })

    const total = await prisma.qualityCheck.count({ where })

    return NextResponse.json({
      qualityChecks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Failed to fetch quality checks:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any
    const body = await request.json()

    const validationResult = createQualityCheckSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Check if mission exists
    const mission = await prisma.mission.findUnique({
      where: { id: data.missionId },
      include: { lead: true }
    })

    if (!mission) {
      return new NextResponse('Mission not found', { status: 404 })
    }

    const qualityCheck = await prisma.$transaction(async (tx) => {
      const check = await tx.qualityCheck.create({
        data: {
          missionId: data.missionId,
          type: data.type,
          status: data.status,
          score: data.score ?? null, // Fix: Convert undefined to null
          checkedBy: user.id,
          checkedAt: data.status !== 'PENDING' ? new Date() : null,
          validatedAt: data.status === 'PASSED' ? new Date() : null,
          notes: data.notes ?? null, // Fix: Convert undefined to null
          photos: data.photos,
          issues: data.issues ?? null, // Fix: Convert undefined to null
          corrections: data.corrections ?? null, // Fix: Convert undefined to null
          followUpRequired: data.followUpRequired,
          followUpDate: data.followUpDate ?? null, // Fix: Convert undefined to null
          clientNotified: data.clientNotified
        },
        include: {
          mission: {
            include: {
              lead: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  email: true
                }
              }
            }
          },
          checkedByUser: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      })

      // Update mission status if quality check passes
      if (data.status === 'PASSED' && mission.status === 'QUALITY_CHECK') {
        await tx.mission.update({
          where: { id: data.missionId },
          data: { status: 'CLIENT_VALIDATION' }
        })
      }

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'QUALITY_ISSUE',
          title: `Contrôle qualité ${data.status === 'PASSED' ? 'approuvé' : 'effectué'}`,
          description: `Contrôle qualité ${data.type} pour la mission ${mission.missionNumber}`,
          userId: user.id,
          leadId: mission.leadId,
        }
      })

      return check
    })

    return NextResponse.json(qualityCheck, { status: 201 })

  } catch (error) {
    console.error('Failed to create quality check:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}