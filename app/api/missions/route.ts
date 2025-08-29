// app/api/missions/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET function remains the same...
export async function GET() {
  try {
    const missions = await prisma.mission.findMany({
      include: {
        lead: true,
        teamLeader: true,
        teamMembers: true,
        quote: true,
        tasks: true,
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
        const { quoteId, leadId, teamLeaderId, type, leadName, ...missionData } = body;

        // Validation
        if (!leadId) return NextResponse.json({ message: 'Lead ID is required.' }, { status: 400 });
        if (!teamLeaderId) return NextResponse.json({ message: 'Team Leader is required.' }, { status: 400 });
        if (!missionData.address) return NextResponse.json({ message: 'Address is required.' }, { status: 400 });
        if (!missionData.scheduledDate) return NextResponse.json({ message: 'Scheduled Date is required.' }, { status: 400 });
        if (type === 'SERVICE' && !quoteId) {
            return NextResponse.json({ message: 'Quote ID is required for a service mission.' }, { status: 400 });
        }
        
        // --- THE FIX IS HERE ---
        // Convert the string from the form into a proper JavaScript Date object.
        // Prisma knows how to handle this object correctly.
        const scheduledDateAsDate = new Date(missionData.scheduledDate);
        // --- END OF FIX ---

        const newMission = await prisma.mission.create({
            data: {
                ...missionData,
                missionNumber: `MISS-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
                estimatedDuration: parseInt(missionData.estimatedDuration),
                scheduledDate: scheduledDateAsDate, // Use the converted Date object here
                type: type,
                lead: { connect: { id: leadId } },
                teamLeader: { connect: { id: teamLeaderId } },
                ...(quoteId && { quote: { connect: { id: quoteId } } }),
            },
        });

        return NextResponse.json(newMission, { status: 201 });

    } catch (error) {
        console.error('Failed to create mission:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error }, { status: 500 });
    }
}