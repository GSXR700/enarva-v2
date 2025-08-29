// app/api/tasks/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                ...body,
                completedAt: body.status === 'COMPLETED' ? new Date() : null,
                startedAt: body.status === 'IN_PROGRESS' && !body.startedAt ? new Date() : body.startedAt,
            },
        });

        return NextResponse.json(updatedTask);
    } catch (error) {
        console.error(`Failed to update task:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}