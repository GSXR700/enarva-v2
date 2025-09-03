// app/api/task-templates/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, TaskCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/task-templates - Fetches all checklist templates
export async function GET() {
  try {
    const templates = await prisma.taskTemplate.findMany({
      include: {
        items: {
          orderBy: {
            title: 'asc',
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to fetch task templates:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/task-templates - Creates a new checklist template
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, items } = body;

        if (!name || !items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ message: 'Template name and at least one item are required.' }, { status: 400 });
        }

        // Validate each item to ensure it has a title and a valid category
        for (const item of items) {
            if (!item.title || !item.category || !Object.values(TaskCategory).includes(item.category)) {
                 return NextResponse.json({ message: `Invalid task item provided: ${JSON.stringify(item)}` }, { status: 400 });
            }
        }

        const newTemplate = await prisma.taskTemplate.create({
            data: {
                name,
                description,
                items: {
                    create: items.map((item: { title: string; category: TaskCategory }) => ({
                        title: item.title,
                        category: item.category,
                    })),
                },
            },
            include: {
                items: true,
            },
        });

        return NextResponse.json(newTemplate, { status: 201 });

    } catch (error) {
        console.error('Failed to create task template:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}