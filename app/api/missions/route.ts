// app/api/missions/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/missions - Fetch all missions
export async function GET() {
  try {
    const missions = await prisma.mission.findMany({
      include: {
        lead: true,         // Include the related lead
        teamLeader: true,   // Include the team leader (User model)
        teamMembers: true,  // Include the assigned team members
        quote: true,        // Include the quote to get the value/price
        tasks: true,        // Include the tasks for the mission
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    })
    return NextResponse.json(missions)
  } catch (error) {
    console.error('Failed to fetch missions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/missions - Create a new mission
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { quoteId, leadId, teamLeaderId, ...missionData } = body;

        if (!quoteId || !leadId || !teamLeaderId || !missionData.address || !missionData.scheduledDate) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const newMission = await prisma.mission.create({
            data: {
                ...missionData,
                missionNumber: `MISS-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                estimatedDuration: parseInt(missionData.estimatedDuration),
                quote: { connect: { id: quoteId } },
                lead: { connect: { id: leadId } },
                teamLeader: { connect: { id: teamLeaderId } },
            },
        });

        return NextResponse.json(newMission, { status: 201 });

    } catch (error) {
        console.error('Failed to create mission:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}