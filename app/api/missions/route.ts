// app/api/missions/route.ts - FIXED VERSION WITH EXISTING SERVICES
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { ExtendedUser } from '@/types/next-auth';
import { missionService, CreateMissionInput } from '@/services/mission.service';
import { validateMissionCreation } from '@/lib/validations';
import { withErrorHandler, AppError } from '@/lib/error-handler';

// GET /api/missions - Fetch missions with filters and pagination
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new AppError(401, 'Unauthorized');
  }

  const user = session.user as ExtendedUser;
  if (!user.id) {
    throw new AppError(401, 'User ID missing');
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const teamLeaderId = searchParams.get('teamLeaderId');
  const teamId = searchParams.get('teamId');
  const search = searchParams.get('search');
  const type = searchParams.get('type');

  // Build filters object using the existing service interface
  const filters: any = {};
  if (status) filters.status = status;
  if (priority) filters.priority = priority;
  if (teamLeaderId) filters.teamLeaderId = teamLeaderId;
  if (teamId) filters.teamId = teamId;
  if (type) filters.type = type;
  if (search) filters.search = search;

  // Pagination options
  const paginationOptions = {
    page,
    limit,
    sortBy: 'scheduledDate',
    sortOrder: 'asc' as const
  };

  try {
    const result = await missionService.getAllMissions(filters, paginationOptions);
    
    return NextResponse.json({
      missions: result.missions,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('Failed to fetch missions:', error);
    throw new AppError(500, 'Failed to fetch missions');
  }
});

// POST /api/missions - Create a new mission with task support
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new AppError(401, 'Unauthorized');
  }

  const user = session.user as ExtendedUser;
  if (!user.id) {
    throw new AppError(401, 'User ID missing');
  }

  // Only admins, managers, and agents can create missions
  if (!['ADMIN', 'MANAGER', 'AGENT'].includes(user.role)) {
    throw new AppError(403, 'Forbidden - Insufficient permissions');
  }

  const body = await request.json();
  console.log('Creating mission with data:', body);

  // Validate using existing validation schema
  const validation = validateMissionCreation(body);
  if (!validation.success) {
    console.error('Mission validation failed:', validation.error.errors);
    throw new AppError(400, 'Validation failed', true);
  }

  const validatedData = validation.data;

  try {
    // Prepare the mission input for the existing service
    const missionInput: CreateMissionInput = {
      leadId: validatedData.leadId,
      quoteId: validatedData.quoteId || null,
      teamLeaderId: validatedData.teamLeaderId || null,
      teamId: validatedData.teamId || null,
      scheduledDate: validatedData.scheduledDate,
      estimatedDuration: validatedData.estimatedDuration,
      address: validatedData.address,
      coordinates: validatedData.coordinates || null,
      accessNotes: validatedData.accessNotes || null,
      priority: validatedData.priority || 'NORMAL',
      type: validatedData.type || 'SERVICE',
      taskTemplateId: validatedData.taskTemplateId || null,
      adminNotes: validatedData.adminNotes || null,
    };

    // Create the mission using the existing service
    const mission = await missionService.createMission(missionInput);

    console.log('Mission created successfully:', mission.id);
    
    return NextResponse.json(mission, { status: 201 });
  } catch (error) {
    console.error('Mission creation failed:', error);
    
    // Handle specific service errors
    if (error instanceof AppError) {
      throw error;
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Team leader not found')) {
      throw new AppError(404, 'Team leader not found - Please ensure the team leader exists and is properly assigned to a team');
    }
    
    if (errorMessage.includes('Lead not found')) {
      throw new AppError(404, 'Lead not found - Please select a valid lead');
    }
    
    if (errorMessage.includes('Quote not found')) {
      throw new AppError(404, 'Quote not found - Please select a valid quote');
    }
    
    if (errorMessage.includes('Team not found')) {
      throw new AppError(404, 'Team not found - Please select a valid team');
    }

    // Handle Prisma-specific errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; message: string };
      
      switch (prismaError.code) {
        case 'P2002':
          throw new AppError(409, 'Duplicate constraint violation - Mission with this data already exists');
        case 'P2003':
          throw new AppError(400, 'Foreign key constraint failed - Invalid reference to lead, quote, or team');
        case 'P2025':
          throw new AppError(404, 'Required record not found during mission creation');
        default:
          console.error('Prisma error:', prismaError);
          throw new AppError(500, 'Database error occurred during mission creation');
      }
    }
    
    throw new AppError(500, `Failed to create mission: ${errorMessage}`);
  }
});

// OPTIONS endpoint for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}