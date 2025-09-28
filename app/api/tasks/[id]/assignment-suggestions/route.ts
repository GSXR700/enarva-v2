import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { TaskAssignmentService } from '@/services/task-assignment.service'

export async function GET(
  _request: NextRequest,
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

    const suggestions = await TaskAssignmentService.getTaskAssignmentSuggestions(taskId)

    return NextResponse.json(suggestions)
  } catch (error) {
    console.error('Failed to get task assignment suggestions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}