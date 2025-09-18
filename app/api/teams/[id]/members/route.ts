// app/api/teams/[id]/members/route.ts - GET TEAM MEMBERS BY TEAM ID
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id: teamId } = await params;

    const teamMembers = await prisma.teamMember.findMany({
      where: {
        teamId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            onlineStatus: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    });

    return NextResponse.json(teamMembers);

  } catch (error) {
    console.error('Failed to fetch team members:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}