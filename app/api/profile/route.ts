// app/api/profile/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { ExtendedUser } from '@/types/next-auth'

const prisma = new PrismaClient()

// PATCH /api/profile - Update the current user's profile
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { name, image } = body;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name,
        image: image,
      },
    });

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Failed to update profile:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}