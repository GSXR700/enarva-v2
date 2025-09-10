import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const teamMember = await prisma.teamMember.findUnique({
      where: { id },
      include: {
        user: true,
        team: true,
        tasks: true,
      },
    });

    if (!teamMember) {
      return new NextResponse('Team member not found', { status: 404 });
    }

    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Error fetching team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const updatedTeamMember = await prisma.teamMember.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(updatedTeamMember);
  } catch (error) {
    console.error('Error updating team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    await prisma.teamMember.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}