// app/api/activities/route.ts - FINAL FIX

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next'; // <-- CORRECT IMPORT PATH
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const activities = await prisma.activity.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 15,
      include: {
        user: {
          select: {
            name: true,
            image: true,
          }
        }
      }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}