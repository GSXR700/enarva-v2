// app/api/task-templates/[id]/route.ts - COMPLETE FIXED VERSION
import { NextResponse } from 'next/server';
import { PrismaClient, TaskCategory } from '@prisma/client';

const prisma = new PrismaClient();

// PUT /api/task-templates/[id] - Updates an existing checklist template
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ Await params for Next.js 15
        const body = await request.json();
        const { name, description, items } = body;

        if (!name || !items || !Array.isArray(items)) {
            return NextResponse.json({ message: 'Invalid data provided.' }, { status: 400 });
        }

        // Use a transaction to ensure data integrity: update the template, delete old items, and create new ones.
        const updatedTemplate = await prisma.$transaction(async (tx) => {
            const template = await tx.taskTemplate.update({
                where: { id },
                data: { name, description },
            });

            await tx.taskTemplateItem.deleteMany({
                where: { templateId: id },
            });

            if (items.length > 0) {
                await tx.taskTemplateItem.createMany({
                    data: items.map((item: { title: string; category: TaskCategory }) => ({
                        title: item.title,
                        category: item.category,
                        templateId: id,
                    })),
                });
            }
            
            return template;
        });

        return NextResponse.json(updatedTemplate);

    } catch (error) {
        console.error(`Failed to update template:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// DELETE /api/task-templates/[id] - Deletes a checklist template
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ Await params for Next.js 15

        await prisma.taskTemplate.delete({
            where: { id },
        });

        return new NextResponse(null, { status: 204 }); // 204 No Content signifies successful deletion

    } catch (error) {
        console.error(`Failed to delete template:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}