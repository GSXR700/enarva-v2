import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      include: {
        user: true,
        team: true,
        tasks: {
          include: {
            mission: {
              include: {
                lead: true,
              },
            },
          },
        },
      },
    });

    if (!teamMember) {
      return new NextResponse('Team member not found', { status: 404 });
    }
    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Failed to fetch team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { email, role, name, ...teamMemberData } = body;

    const existingTeamMember = await prisma.teamMember.findUnique({
      where: { id },
    });

    if (!existingTeamMember) {
      return new NextResponse('Team member not found', { status: 404 });
    }

    const updatedTeamMember = await prisma.teamMember.update({
      where: { id },
      data: {
        ...teamMemberData,
        user: {
          update: {
            name,
            email,
            role,
          },
        },
      },
      include: { user: true },
    });

    return NextResponse.json(updatedTeamMember);
  } catch (error) {
    console.error('Failed to update team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const teamMember = await prisma.teamMember.findUnique({ where: { id } });

    if (!teamMember) {
      return new NextResponse('Team member not found', { status: 404 });
    }

    // Using a transaction to ensure both the team member and their user record are deleted
    await prisma.$transaction([
      prisma.teamMember.delete({ where: { id } }),
      prisma.user.delete({ where: { id: teamMember.userId } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}