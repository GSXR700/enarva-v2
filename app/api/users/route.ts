import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { UserRole, TeamSpecialty, ExperienceLevel, TeamAvailability } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

// Enhanced user schema with experience and speciality fields
const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
  role: z.nativeEnum(UserRole),
  specialties: z.array(z.nativeEnum(TeamSpecialty)).default([]),
  experience: z.nativeEnum(ExperienceLevel).default(ExperienceLevel.JUNIOR),
  availability: z.nativeEnum(TeamAvailability).default(TeamAvailability.AVAILABLE),
  hourlyRate: z.number().min(0).max(1000).optional().nullable().transform(val => val ?? null),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') as UserRole | null
    const skip = (page - 1) * limit

    const whereClause: any = {}

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (role) {
      whereClause.role = role
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          onlineStatus: true,
          lastSeen: true,
          createdAt: true,
          teamMemberships: {
            where: { isActive: true },
            select: {
              specialties: true,
              experience: true,
              availability: true,
              hourlyRate: true,
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where: whereClause })
    ])

    const enhancedUsers = users.map((user: any) => ({
      ...user,
      specialties: user.teamMemberships[0]?.specialties || [],
      experience: user.teamMemberships[0]?.experience || 'JUNIOR',
      availability: user.teamMemberships[0]?.availability || 'AVAILABLE',
      hourlyRate: user.teamMemberships[0]?.hourlyRate || null,
      currentTeam: user.teamMemberships[0]?.team || null
    }))

    return NextResponse.json({
      users: enhancedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const body = await request.json()
    const validationResult = userCreateSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, email, password, role, specialties, experience, availability, hourlyRate } = validationResult.data

    // Check if user with email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password if provided
    let hashedPassword = null
    if (password) {
      hashedPassword = await bcrypt.hash(password, 12)
    }

    // Create user with transaction to handle team membership
    const newUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          email,
          hashedPassword,
          role,
          onlineStatus: 'OFFLINE'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          onlineStatus: true,
          createdAt: true
        }
      })

      // If user has specialties or experience, try to find or create a default team
      if (specialties.length > 0 || experience !== 'JUNIOR' || hourlyRate) {
        const defaultTeam = await tx.team.findFirst({
          where: { name: 'Default Team' }
        })

        let teamId = defaultTeam?.id

        if (!teamId) {
          const createdTeam = await tx.team.create({
            data: {
              name: 'Default Team',
              description: 'Default team for users with specialties'
            }
          })
          teamId = createdTeam.id
        }

        // Create proper team member data with correct typing
        const teamMemberData: Prisma.TeamMemberUncheckedCreateInput = {
          userId: createdUser.id,
          teamId,
          specialties,
          experience,
          availability,
          hourlyRate: hourlyRate ? new Decimal(hourlyRate) : null,
          isActive: true,
          joinedAt: new Date()
        }

        await tx.teamMember.create({
          data: teamMemberData
        })
      }

      return createdUser
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Failed to create user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}