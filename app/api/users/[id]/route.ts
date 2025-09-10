// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient()

// PUT /api/users/[id] - Update a user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const loggedInUser = session?.user as ExtendedUser;
    
    if (!loggedInUser || loggedInUser.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, role } = body

    if (!name || !email || !role) {
      return NextResponse.json(
        { message: 'Nom, email et rôle sont requis' }, 
        { status: 400 }
      )
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: { id }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Cet email est déjà utilisé par un autre utilisateur' }, 
        { status: 400 }
      )
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        role: role as UserRole,
        updatedAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        onlineStatus: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error('Failed to update user:', error)
    
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' }, 
        { status: 404 }
      )
    }

    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// DELETE /api/users/[id] - Delete a user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const loggedInUser = session?.user as ExtendedUser;
    
    if (!loggedInUser || loggedInUser.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params

    // Prevent admin from deleting themselves
    if (loggedInUser.id === id) {
      return NextResponse.json(
        { message: 'Vous ne pouvez pas supprimer votre propre compte' }, 
        { status: 400 }
      )
    }

    // Check if user exists and get their details
    const userToDelete = await prisma.user.findUnique({
      where: { id },
      include: {
        leadsAssigned: true,
        missionsLed: true,
        activities: true,
        expenses: true
      }
    })

    if (!userToDelete) {
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' }, 
        { status: 404 }
      )
    }

    // Check if user has associated data that would prevent deletion
    const hasAssociatedData = 
      userToDelete.leadsAssigned.length > 0 || 
      userToDelete.missionsLed.length > 0 || 
      userToDelete.activities.length > 0 || 
      userToDelete.expenses.length > 0

    if (hasAssociatedData) {
      return NextResponse.json(
        { 
          message: 'Impossible de supprimer cet utilisateur car il a des données associées (leads, missions, activités ou dépenses)' 
        }, 
        { status: 400 }
      )
    }

    // Delete the user
    await prisma.user.delete({
      where: { id }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    console.error('Failed to delete user:', error)
    
    if (error?.code === 'P2025') {
      return NextResponse.json(
        { message: 'Utilisateur non trouvé' }, 
        { status: 404 }
      )
    }

    return new NextResponse('Internal Server Error', { status: 500 })
  }
}