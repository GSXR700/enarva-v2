// app/api/missions/[id]/route.ts - COMPLETE FIXED VERSION
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET handler to fetch a single mission by its ID
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ Await params for Next.js 15
        
        const mission = await prisma.mission.findUnique({
            where: { id },
            include: { 
                lead: true // Include lead details for display
            }
        });

        if (!mission) {
            return new NextResponse('Mission not found', { status: 404 });
        }
        return NextResponse.json(mission);
    } catch (error) {
        console.error(`Failed to fetch mission:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

// PATCH handler to update the mission with a report or new status
export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ Await params for Next.js 15
        const body = await request.json();

        // Ensure that if scheduledDate is passed, it's a valid Date
        if (body.scheduledDate) {
            body.scheduledDate = new Date(body.scheduledDate);
        }

        const updatedMission = await prisma.mission.update({
            where: { id },
            data: body,
            include: {
                lead: true // Include the related lead object in the response
            }
        });

        return NextResponse.json(updatedMission);
    } catch (error) {
        console.error(`Failed to update mission:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}