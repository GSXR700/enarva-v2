// app/api/missions/[id]/route.ts - UPDATED TO USE SERVICE LAYER
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { missionService } from '@/services/mission.service';
import { errorHandler } from '@/lib/error-handler';
import { z } from 'zod';

// Validation schema for mission updates
const missionUpdateSchema = z.object({
  name: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK', 'CLIENT_VALIDATION', 'COMPLETED', 'CANCELLED']).optional(),
  teamId: z.string().optional(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(['GENERAL', 'CLEANING', 'MAINTENANCE', 'INSPECTION', 'SETUP']).optional(),
    type: z.enum(['EXECUTION', 'QUALITY_CHECK', 'DOCUMENTATION', 'CLIENT_INTERACTION']).optional(),
    estimatedDuration: z.number().optional(),
    priority: z.string().optional(),
    assignedToId: z.string().optional(),
  })).optional(),
});

// GET /api/missions/[id] - Retrieve a specific mission
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const mission = await missionService.getMissionById(id);
    return NextResponse.json(mission);
  } catch (error) {
    console.error('Failed to retrieve mission:', error);
    return errorHandler(error);
  }
}

// PUT /api/missions/[id] - Update a mission
export async function PUT(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = missionUpdateSchema.parse(body);

    const updatedMission = await missionService.updateMission(id, validatedData);
    return NextResponse.json(updatedMission);
  } catch (error) {
    console.error('Failed to update mission:', error);
    return errorHandler(error);
  }
}

// PATCH /api/missions/[id] - Partially update a mission (e.g., status changes)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const updatedMission = await missionService.patchMission(id, body);
    return NextResponse.json(updatedMission);
  } catch (error) {
    console.error('Failed to update mission:', error);
    return errorHandler(error);
  }
}

// DELETE /api/missions/[id] - Delete a mission
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    const result = await missionService.deleteMission(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to delete mission:', error);
    return errorHandler(error);
  }
}