// app/api/leads/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/leads/[id]
 * Fetches a single lead by its ID.
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {
    const { id } = params; // Déclarer l'id ici pour qu'il soit accessible partout
    try {
        const lead = await prisma.lead.findUnique({ 
            where: { id },
            include: { assignedTo: true }
        });

        if (!lead) {
            return new NextResponse('Lead not found', { status: 404 });
        }
        return NextResponse.json(lead);
    } catch (error) {
        console.error(`Failed to fetch lead ${id}:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

/**
 * PATCH /api/leads/[id]
 * Updates a specific lead with new data.
 */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
    const { id } = params; // Déclarer l'id ici
    try {
        const body = await request.json();
        
        const updateData = {
            ...body,
            // Assurer la bonne conversion des types avant l'envoi à Prisma
            estimatedSurface: body.estimatedSurface ? parseInt(body.estimatedSurface, 10) : null,
            score: body.score !== undefined ? parseInt(String(body.score), 10) : undefined,
            needsProducts: body.needsProducts !== undefined ? Boolean(body.needsProducts) : undefined,
            needsEquipment: body.needsEquipment !== undefined ? Boolean(body.needsEquipment) : undefined,
            hasReferrer: body.hasReferrer !== undefined ? Boolean(body.hasReferrer) : undefined,
            assignedToId: body.assignedToId || null,
            // Assurer que les enums vides sont envoyés comme null
            propertyType: body.propertyType || null,
            urgencyLevel: body.urgencyLevel || null,
            frequency: body.frequency || null,
            contractType: body.contractType || null,
        };
        
        delete updateData.id;
        delete updateData.createdAt; 
        delete updateData.updatedAt;

        const updatedLead = await prisma.lead.update({
            where: { id },
            data: updateData,
        });
        return NextResponse.json(updatedLead);
    } catch (error) {
        console.error(`Failed to update lead ${id}:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

/**
 * DELETE /api/leads/[id]
 * Deletes a specific lead.
 */
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    const { id } = params; // Déclarer l'id ici
    try {
        await prisma.lead.delete({
            where: { id },
        });
        return new NextResponse(null, { status: 204 }); // No Content
    } catch (error) {
        console.error(`Failed to delete lead ${id}:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
