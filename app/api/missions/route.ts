// app/api/missions/route.ts - COMPLETE CORRECTED VERSION
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { missionService } from '@/services/mission.service';
import { errorHandler } from '@/lib/error-handler';
import { validateMissionInput } from '@/lib/validation';
import { ExtendedUser } from '@/types/next-auth';

// GET /api/missions - Fetch all missions with optional filtering and sorting
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const sortBy = searchParams.get('sortBy') || 'scheduledDate';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const teamLeaderId = searchParams.get('teamLeaderId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for filtering
    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (teamLeaderId && teamLeaderId !== 'all') {
      where.teamLeaderId = teamLeaderId;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate);
      }
    }

    const { missions, totalCount } = await missionService.getMissions(where, page, limit, sortBy, sortOrder);

    return NextResponse.json({
      missions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Failed to fetch missions:', error);
    return errorHandler(error);
  }
}

// POST /api/missions - Create a new mission
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return NextResponse.json({ error: 'User ID missing' }, { status: 401 });
    }

    // Only admins and managers can create missions
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validate the input
    const validationResult = validateMissionInput(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    const newMission = await missionService.createMission(validationResult.data);

    return NextResponse.json(newMission, { status: 201 });
  } catch (error) {
    console.error('Failed to create mission:', error);
    return errorHandler(error);
  }
}