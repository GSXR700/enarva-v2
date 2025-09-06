// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/api/team-members/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/team-members/[id] - Fetch a single team member
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      include: { user: true },
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

// PATCH /api/team-members/[id] - Update a team member's details
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email, name, role, firstName, lastName, phone, specialties, experienceLevel, availability } = body;

    const teamMember = await prisma.teamMember.findUnique({ where: { id } });
    if (!teamMember) {
        return new NextResponse('Team member not found', { status: 404 });
    }

    const updatedTeamMember = await prisma.teamMember.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone,
        email,
        specialties,
        experienceLevel,
        availability,
        user: {
          update: {
            name: `${firstName} ${lastName}`,
            email,
            role,
          },
        },
      },
      include: {
        user: true,
      },
    });

    return NextResponse.json(updatedTeamMember);
  } catch (error) {
    console.error('Failed to update team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/team-members/[id] - Delete a team member and their user account
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const teamMember = await prisma.teamMember.findUnique({ where: { id } });
    if (!teamMember) {
      return new NextResponse('Team member not found', { status: 404 });
    }

    // Use a transaction to ensure both the user and team member are deleted
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