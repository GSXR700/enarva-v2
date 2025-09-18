// app/api/missions/completed/route.ts - GET COMPLETED MISSIONS FOR FIELD REPORTS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get completed missions that don't have field reports yet
    const completedMissions = await prisma.mission.findMany({
      where: {
        status: 'COMPLETED',
        fieldReport: null // Only missions without field reports
      },
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            address: true
          }
        },
        teamLeader: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(completedMissions);

  } catch (error) {
    console.error('Failed to fetch completed missions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}