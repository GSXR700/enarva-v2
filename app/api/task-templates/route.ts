import { NextResponse } from 'next/server';
import { PrismaClient, TaskCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// GET /api/task-templates - Fetches all checklist templates
export async function GET() {
  try {
    const templates = await prisma.taskTemplate.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        tasks: true,
        category: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Failed to fetch task templates:', error);
    return NextResponse.json({ error: 'Failed to fetch task templates' }, { status: 500 });
  }
}

// POST /api/task-templates - Creates a new checklist template
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, tasks, category } = body;

    if (!name || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ message: 'Template name and at least one task are required.' }, { status: 400 });
    }

    // Validate each task to ensure it has a title and a valid category
    for (const task of tasks) {
      if (!task.title || !task.category || !Object.values(TaskCategory).includes(task.category)) {
        return NextResponse.json({ message: `Invalid task item provided: ${JSON.stringify(task)}` }, { status: 400 });
      }
    }

    // Validate category
    if (!category || !Object.values(TaskCategory).includes(category)) {
      return NextResponse.json({ message: `Invalid category provided: ${category}` }, { status: 400 });
    }

    const newTemplate = await prisma.taskTemplate.create({
      data: {
        name,
        description,
        tasks, // Store tasks as JSON
        category,
        isActive: true,
      },
    });

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('Failed to create task template:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}