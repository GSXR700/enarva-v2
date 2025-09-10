import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'MANAGER', 'TEAM_LEADER'].includes((session.user as ExtendedUser).role || '')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get('missionId');

    const qualityChecks = await prisma.qualityCheck.findMany({
      where: {
        ...(missionId && { missionId }),
      },
      include: {
        mission: {
          select: { missionNumber: true, status: true },
        },
      },
      orderBy: {
        checkedAt: 'desc',
      },
    });

    return NextResponse.json(qualityChecks);
  } catch (error) {
    console.error('Error fetching quality checks:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const user = session.user as ExtendedUser;

    const body = await request.json();
    const {
      missionId,
      type,
      status,
      notes,
      photos,
      issues,
    } = body;

    if (!missionId || !type || !status) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newQualityCheck = await prisma.qualityCheck.create({
      data: {
        missionId,
        type,
        status,
        checkedBy: user.id,
        checkedAt: new Date(),
        notes,
        photos,
        issues,
      },
    });

    // Also update the mission status
    await prisma.mission.update({
        where: { id: missionId },
        data: { status: 'QUALITY_CHECK' },
    });

    return NextResponse.json(newQualityCheck, { status: 201 });
  } catch (error) {
    console.error('Error creating quality check:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}