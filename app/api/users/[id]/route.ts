// app/api/users/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ExtendedUser } from '@/types/next-auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ 
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            onlineStatus: true,
            lastSeen: true,
            createdAt: true,
            updatedAt: true,
            teamMember: {
                include: {
                    missions: true,
                    tasks: true
                }
            },
            leads: true,
            missions: true,
            activities: true,
            expenses: true
        }
    });
    
    if (!user) return new NextResponse('User not found', { status: 404 });
    return NextResponse.json(user);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentUser = session.user as ExtendedUser;
    const { id } = await params;
    const body = await request.json();
    
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { password, ...updateData } = body;
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        onlineStatus: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentUser = session.user as ExtendedUser;
    if (currentUser.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { id } = await params;
    
    if (currentUser.id === id) {
      return new NextResponse('Cannot delete your own account', { status: 400 });
    }

    await prisma.$transaction([
      prisma.teamMember.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } })
    ]);
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}