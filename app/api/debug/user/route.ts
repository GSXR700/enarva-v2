// app/api/debug/user/route.ts - DEBUG ENDPOINT
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Debug - Session:', {
      exists: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      } : null
    });

    if (!session?.user) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    
    if (!user.id) {
      return NextResponse.json({ 
        error: 'No user ID in session',
        sessionUser: user
      }, { status: 400 });
    }

    // Check if user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Also check by email
    const userByEmail = user.email ? await prisma.user.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    }) : null;

    return NextResponse.json({
      session: {
        userId: user.id,
        userEmail: user.email,
        userName: user.name
      },
      userFoundById: dbUser,
      userFoundByEmail: userByEmail,
      issue: !dbUser ? 'User ID from session does not exist in database' : null
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: error }, { status: 500 });
  }
}