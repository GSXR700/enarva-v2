import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TaskAssignmentService } from '@/services/task-assignment.service'
import { z } from 'zod'

const assignTaskSchema = z.object({
  memberId: z.string().min(1, 'Member ID is required')
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && user.role !== 'TEAM_LEADER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { id: taskId } = await params
    const body = await request.json()
    
    const validationResult = assignTaskSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { memberId } = validationResult.data

    const updatedTask = await TaskAssignmentService.reassignTask(taskId, memberId)

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Failed to assign task:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('not found')) {
      return new NextResponse('Task or team member not found', { status: 404 })
    }

    return new NextResponse('Internal Server Error', { status: 500 })
  }
}