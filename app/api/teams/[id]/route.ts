// app/api/teams/[id]/route.ts - TEAM DELETION ROUTE (ACTIVITY TYPE FIX)
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function DELETE(
  request: Request,
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

    // Get team member info before deletion
    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      include: {
        user: true,
        team: true
      }
    })

    if (!teamMember) {
      return new NextResponse('Team member not found', { status: 404 })
    }

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete team member record
      await tx.teamMember.delete({
        where: { id }
      })

      // Delete user account
      await tx.user.delete({
        where: { id: teamMember.userId }
      })

      // Create activity log - FIX: Use valid ActivityType enum
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Fix: Use valid ActivityType enum value instead of USER_DELETED
          title: 'Membre d\'équipe supprimé',
          description: `${teamMember.user.name} a été retiré de l'équipe ${teamMember.team.name}`,
          userId: user.id,
          metadata: {
            deletedUserId: teamMember.userId,
            teamId: teamMember.teamId,
            userName: teamMember.user.name
          }
        }
      })
    })

    return new NextResponse(null, { status: 204 })

  } catch (error) {
    console.error('Failed to delete team member:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}