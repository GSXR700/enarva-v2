import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { UserRole, TeamSpecialty, ExperienceLevel, TeamAvailability } from '@prisma/client'
import type { Prisma } from '@prisma/client'

const userUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  role: z.nativeEnum(UserRole).optional(),
  specialties: z.array(z.nativeEnum(TeamSpecialty)).optional(),
  experience: z.nativeEnum(ExperienceLevel).optional(),
  availability: z.nativeEnum(TeamAvailability).optional(),
  hourlyRate: z.number().min(0).max(1000).optional().nullable(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
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
            id: true,
            specialties: true,
            experience: true,
            availability: true,
            hourlyRate: true,
            joinedAt: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    })

    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const enhancedUser = {
      ...user,
      specialties: user.teamMemberships[0]?.specialties || [],
      experience: user.teamMemberships[0]?.experience || 'JUNIOR',
      availability: user.teamMemberships[0]?.availability || 'AVAILABLE',
      hourlyRate: user.teamMemberships[0]?.hourlyRate || null,
      currentTeam: user.teamMemberships[0]?.team || null,
      teamMembershipId: user.teamMemberships[0]?.id || null
    }

    return NextResponse.json(enhancedUser)
  } catch (error) {
    console.error('Failed to fetch user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    
    const validationResult = userUpdateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { name, email, role, specialties, experience, availability, hourlyRate } = validationResult.data

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        teamMemberships: {
          where: { isActive: true }
        }
      }
    })

    if (!existingUser) {
      return new NextResponse('User not found', { status: 404 })
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email }
      })
      if (emailTaken) {
        return NextResponse.json(
          { error: 'Email already taken by another user' },
          { status: 409 }
        )
      }
    }

    const updatedUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Update user basic info
      const userUpdate: any = {}
      if (name !== undefined) userUpdate.name = name
      if (email !== undefined) userUpdate.email = email
      if (role !== undefined) userUpdate.role = role

      const updated = await tx.user.update({
        where: { id },
        data: userUpdate,
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

      // Update team membership if specialties/experience provided
      if (specialties !== undefined || experience !== undefined || availability !== undefined || hourlyRate !== undefined) {
        const currentMembership = existingUser.teamMemberships[0]

        if (currentMembership) {
          // Update existing membership
          const membershipUpdate: any = {}
          if (specialties !== undefined) membershipUpdate.specialties = specialties
          if (experience !== undefined) membershipUpdate.experience = experience
          if (availability !== undefined) membershipUpdate.availability = availability
          if (hourlyRate !== undefined) membershipUpdate.hourlyRate = hourlyRate

          await tx.teamMember.update({
            where: { id: currentMembership.id },
            data: membershipUpdate
          })
        } else if (specialties && specialties.length > 0) {
          // Create new membership if user has specialties but no team
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

          await tx.teamMember.create({
            data: {
              userId: id,
              teamId,
              specialties: specialties || [],
              experience: experience || 'JUNIOR',
              availability: availability || 'AVAILABLE',
              hourlyRate: hourlyRate || null,
              isActive: true,
              joinedAt: new Date()
            }
          })
        }
      }

      return updated
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { id } = await params

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    })

    if (!existingUser) {
      return new NextResponse('User not found', { status: 404 })
    }

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}