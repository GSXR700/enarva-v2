import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskTemplate = await prisma.taskTemplate.findUnique({
      where: { id },
    });

    if (!taskTemplate) {
      return new NextResponse('Task template not found', { status: 404 });
    }

    return NextResponse.json(taskTemplate);
  } catch (error) {
    console.error('Error fetching task template:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updatedTaskTemplate = await prisma.taskTemplate.update({
      where: { id },
      data: body,
    });
    return NextResponse.json(updatedTaskTemplate);
  } catch (error) {
    console.error('Error updating task template:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.taskTemplate.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting task template:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}