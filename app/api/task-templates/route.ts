// app/api/task-templates/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, TaskCategory, Prisma } from '@prisma/client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const prisma = new PrismaClient();

// Validation schema for creating a new template
const createTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(TaskCategory, {
    errorMap: () => ({ message: 'A valid category is required' }),
  }),
  tasks: z.array(z.object({
      title: z.string().min(1, 'Task title is required'),
      category: z.nativeEnum(TaskCategory, {
        errorMap: () => ({ message: 'Invalid task category' }),
      }),
    })).min(1, 'At least one task is required'),
});

/**
 * @route GET /api/task-templates
 * @description Fetches all task templates.
 */
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
    console.error('[API_TASK_TEMPLATES_GET]', error);
    return NextResponse.json(
      { error: { type: 'Server Error', message: 'Failed to fetch task templates' } },
      { status: 500 }
    );
  }
}

/**
 * @route POST /api/task-templates
 * @description Creates a new task template.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = createTemplateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            type: 'Validation Error',
            message: 'Invalid data provided.',
            details: validation.error.errors,
          },
        },
        { status: 400 }
      );
    }

    const { name, description, tasks, category } = validation.data;

    const newTemplate = await prisma.taskTemplate.create({
      data: {
        name,
        description: description, // Correctly pass null or string
        tasks,
        category,
        isActive: true,
      } as Prisma.TaskTemplateCreateInput, // Casting to the correct Prisma type
    });

    return NextResponse.json(newTemplate, { status: 201 });
  } catch (error) {
    console.error('[API_TASK_TEMPLATES_POST]', error);
    return NextResponse.json(
      { error: { type: 'Server Error', message: 'Failed to create task template.' } },
      { status: 500 }
    );
  }
}