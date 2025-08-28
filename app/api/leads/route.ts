// app/api/leads/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

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
    const body = await request.json()
    
    // --- Validation based on your detailed requirements ---
    if (!body.firstName || !body.lastName || !body.phone || !body.channel) {
      return new NextResponse('Les champs Prénom, Nom, Téléphone et Canal sont obligatoires.', { status: 400 })
    }
    if (body.leadType === 'PROFESSIONNEL' && (!body.company || !body.iceNumber)) {
        return new NextResponse("La raison sociale et l'ICE sont obligatoires pour les professionnels.", { status: 400 });
    }
     if (body.leadType === 'PUBLIC' && !body.company) {
        return new NextResponse("La dénomination officielle est obligatoire pour les organismes publics.", { status: 400 });
    }

    // --- Data preparation for Prisma ---
    const leadData = {
      ...body,
      // Convert numeric fields from string to number, ensuring null if empty
      estimatedSurface: body.estimatedSurface ? parseInt(body.estimatedSurface, 10) : null,
      score: body.score ? parseInt(body.score, 10) : 0,
      
      // Convert boolean fields
      needsProducts: body.needsProducts ? Boolean(body.needsProducts) : false,
      needsEquipment: body.needsEquipment ? Boolean(body.needsEquipment) : false,
      hasReferrer: body.hasReferrer ? Boolean(body.hasReferrer) : false,
      
      // Ensure optional relations are set to null if not provided
      assignedToId: body.assignedToId || null,

      // Handle JSON data for product requests
      materials: body.materials || null,
    };

    const newLead = await prisma.lead.create({
      data: leadData,
    });

    // The real-time notification is now handled client-side in the main leads page
    // upon successful creation, ensuring a more robust flow.

    return NextResponse.json(newLead, { status: 201 })
  } catch (error) {
    console.error('Failed to create lead:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
