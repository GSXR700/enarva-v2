// app/api/task-templates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, TaskCategory, Prisma } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema for updating a template (all fields are optional)
const updateTemplateSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  description: z.string().optional().nullable(),
  category: z.nativeEnum(TaskCategory).optional(),
  isActive: z.boolean().optional(),
  tasks: z.array(z.object({
      title: z.string().min(1, 'Task title is required'),
      category: z.nativeEnum(TaskCategory, { errorMap: () => ({ message: 'Invalid task category' }) }),
    })).min(1, 'At least one task is required').optional(),
}).strict();

/**
 * @route GET /api/task-templates/{id}
 * @description Fetches a single task template by its ID.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const taskTemplate = await prisma.taskTemplate.findUnique({
      where: { id },
    });

    if (!taskTemplate) {
      return NextResponse.json(
        { error: { type: 'Not Found', message: 'Task template not found.' } },
        { status: 404 }
      );
    }

    return NextResponse.json(taskTemplate);
  } catch (error) {
    console.error('[API_TASK_TEMPLATE_ID_GET]', error);
    return NextResponse.json(
      { error: { type: 'Server Error', message: 'Failed to fetch task template.' } },
      { status: 500 }
    );
  }
}

/**
 * @route PUT /api/task-templates/{id}
 * @description Updates an existing task template.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const validation = updateTemplateSchema.safeParse(body);
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

    const { tasks, ...otherData } = validation.data;

    // Build the update object carefully to avoid passing `undefined` values to Prisma.
    const dataToUpdate: Prisma.TaskTemplateUpdateInput = {};

    // Only add non-undefined properties to the update object.
    Object.keys(otherData).forEach(key => {
        const typedKey = key as keyof typeof otherData;
        if (otherData[typedKey] !== undefined) {
            (dataToUpdate as any)[typedKey] = otherData[typedKey];
        }
    });

    // Handle the JSON 'tasks' field with Prisma's explicit 'set' operation.
    if (tasks) {
      dataToUpdate.tasks = { set: tasks };
    }

    const updatedTaskTemplate = await prisma.taskTemplate.update({
      where: { id },
      data: dataToUpdate,
    });

    return NextResponse.json(updatedTaskTemplate);
  } catch (error) {
    console.error('[API_TASK_TEMPLATE_ID_PUT]', error);
    // Handle potential errors, like the record not being found
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json(
            { error: { type: 'Not Found', message: 'Task template to update not found.' } },
            { status: 404 }
        );
    }
    return NextResponse.json(
      { error: { type: 'Server Error', message: 'Failed to update task template.' } },
      { status: 500 }
    );
  }
}

/**
 * @route DELETE /api/task-templates/{id}
 * @description Deletes a task template.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.taskTemplate.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[API_TASK_TEMPLATE_ID_DELETE]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return NextResponse.json(
            { error: { type: 'Not Found', message: 'Task template to delete not found.' } },
            { status: 404 }
        );
    }
    return NextResponse.json(
      { error: { type: 'Server Error', message: 'Failed to delete task template.' } },
      { status: 500 }
    );
  }
}