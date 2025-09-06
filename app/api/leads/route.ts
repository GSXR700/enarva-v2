// app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Fetch ALL fields with relations
    const leads = await prisma.lead.findMany({
      include: {
        assignedTo: true,
        quotes: true,
        missions: true,
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        subscription: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    
    // Create lead with ALL fields from the form
    const lead = await prisma.lead.create({
      data: {
        // General Information
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        email: body.email,
        address: body.address,
        gpsLocation: body.gpsLocation,
        status: body.status,
        score: body.score,
        
        // Professional Details  
        leadType: body.leadType,
        company: body.company,
        iceNumber: body.iceNumber,
        activitySector: body.activitySector,
        contactPosition: body.contactPosition,
        department: body.department,
        
        // Request Details
        propertyType: body.propertyType,
        estimatedSurface: body.estimatedSurface,
        accessibility: body.accessibility,
        materials: body.materials,
        urgencyLevel: body.urgencyLevel,
        budgetRange: body.budgetRange,
        frequency: body.frequency,
        contractType: body.contractType,
        
        // Products & Equipment
        needsProducts: body.needsProducts,
        needsEquipment: body.needsEquipment,
        providedBy: body.providedBy,
        
        // Lead Origin
        channel: body.channel,
        source: body.source,
        hasReferrer: body.hasReferrer,
        referrerContact: body.referrerContact,
        enarvaRole: body.enarvaRole,
        
        // Follow-up
        originalMessage: body.originalMessage,
        assignedToId: body.assignedToId,
      },
      include: {
        assignedTo: true,
      },
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'LEAD_CREATED',
        title: 'Nouveau lead créé',
        description: `Lead ${lead.firstName} ${lead.lastName} créé`,
        userId: session.user.id,
        leadId: lead.id,
      },
    });

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}