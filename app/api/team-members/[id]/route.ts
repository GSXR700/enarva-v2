// app/api/team-members/[id]/route.ts - FIXED FOR NEXT.JS 15
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Await params for Next.js 15
    const teamMember = await prisma.teamMember.findUnique({ where: { id }, include: { user: true } });
    if (!teamMember) return new NextResponse('Team member not found', { status: 404 });
    return NextResponse.json(teamMember);
  } catch (error) {
    console.error('Failed to fetch team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Await params for Next.js 15
    const body = await request.json();
    const { email, role, firstName, lastName, ...teamMemberData } = body;
    const teamMember = await prisma.teamMember.findUnique({ where: { id } });
    if (!teamMember) return new NextResponse('Team member not found', { status: 404 });

    const updatedTeamMember = await prisma.teamMember.update({
      where: { id },
      data: {
        ...teamMemberData,
        firstName,
        lastName,
        email,
        user: { update: { name: `${firstName} ${lastName}`, email, role } },
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ✅ Await params for Next.js 15
    const teamMember = await prisma.teamMember.findUnique({ where: { id } });
    if (!teamMember) return new NextResponse('Team member not found', { status: 404 });
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