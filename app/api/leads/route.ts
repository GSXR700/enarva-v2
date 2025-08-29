// app/api/leads/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient()

/**
 * GET /api/leads
 * Fetches all leads, including their assigned user details.
 * Ordered by creation date descending.
 */
export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        assignedTo: true, // Include the assigned user details
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(leads)
  } catch (error) {
    console.error('Failed to fetch leads:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

/**
 * POST /api/leads
 * Creates a new lead with comprehensive data validation and type conversion.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json()

    if (!body.firstName || !body.lastName || !body.phone || !body.channel) {
      return new NextResponse('Les champs Prénom, Nom, Téléphone et Canal sont obligatoires.', { status: 400 })
    }
    if (body.leadType === 'PROFESSIONNEL' && (!body.company || !body.iceNumber)) {
        return new NextResponse("La raison sociale et l'ICE sont obligatoires pour les professionnels.", { status: 400 });
    }
     if (body.leadType === 'PUBLIC' && !body.company) {
        return new NextResponse("La dénomination officielle est obligatoire pour les organismes publics.", { status: 400 });
    }

    const leadData = {
      ...body,
      estimatedSurface: body.estimatedSurface ? parseInt(body.estimatedSurface, 10) : null,
      score: body.score ? parseInt(body.score, 10) : 0,
      needsProducts: body.needsProducts ? Boolean(body.needsProducts) : false,
      needsEquipment: body.needsEquipment ? Boolean(body.needsEquipment) : false,
      hasReferrer: body.hasReferrer ? Boolean(body.hasReferrer) : false,
      assignedToId: body.assignedToId || null,
      materials: body.materials || null,
    };

    const newLead = await prisma.lead.create({
      data: leadData,
    });

    // Create a corresponding activity
    await prisma.activity.create({
      data: {
        type: 'LEAD_CREATED',
        title: `Nouveau lead: ${newLead.firstName} ${newLead.lastName}`,
        description: `Un nouveau lead a été créé via le canal ${newLead.channel}.`,
        userId: session.user.id,
        leadId: newLead.id,
      }
    });

    return NextResponse.json(newLead, { status: 201 })
  } catch (error) {
    console.error('Failed to create lead:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}