// app/api/leads/[id]/route.ts - DELETE method updated with constraint handling
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/leads/[id]
 * Fetches a single lead by its ID.
 */
export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ Await params for Next.js 15
        
        const lead = await prisma.lead.findUnique({ 
            where: { id },
            include: { assignedTo: true }
        });

        if (!lead) {
            return new NextResponse('Lead not found', { status: 404 });
        }
        return NextResponse.json(lead);
    } catch (error) {
        console.error(`Failed to fetch lead:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

/**
 * PATCH /api/leads/[id]
 * Updates a specific lead with new data.
 */
export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ Await params for Next.js 15
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
        console.error(`Failed to update lead:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

/**
 * DELETE /api/leads/[id]
 * Deletes a specific lead with relationship checking.
 */
export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params; // ✅ Await params for Next.js 15
        
        console.log('🗑️ Attempting to delete lead:', id);

        // Check if lead exists and get its relationships
        const leadWithRelationships = await prisma.lead.findUnique({
            where: { id },
            include: {
                missions: {
                    select: { 
                        id: true, 
                        missionNumber: true, 
                        status: true 
                    }
                },
                quotes: {
                    select: { 
                        id: true, 
                        quoteNumber: true, 
                        status: true 
                    }
                },
                subscription: {
                    select: { 
                        id: true, 
                        type: true, 
                        status: true 
                    }
                },
                expenses: {
                    select: { 
                        id: true, 
                        amount: true 
                    }
                },
                activities: {
                    select: { 
                        id: true 
                    }
                }
            }
        });

        if (!leadWithRelationships) {
            return new NextResponse('Lead not found', { status: 404 });
        }

        // Check for relationships that prevent deletion
        const relationships = [];
        if (leadWithRelationships.missions.length > 0) {
            relationships.push(`${leadWithRelationships.missions.length} mission(s)`);
        }
        if (leadWithRelationships.quotes.length > 0) {
            relationships.push(`${leadWithRelationships.quotes.length} devis`);
        }
        if (leadWithRelationships.subscription) {
            relationships.push('1 abonnement actif');
        }
        if (leadWithRelationships.expenses.length > 0) {
            relationships.push(`${leadWithRelationships.expenses.length} dépense(s)`);
        }

        // If there are blocking relationships, return error
        if (relationships.length > 0) {
            return NextResponse.json({
                error: 'CONSTRAINT_VIOLATION',
                message: `Impossible de supprimer ce lead car il est lié à : ${relationships.join(', ')}.`,
                leadInfo: {
                    name: `${leadWithRelationships.firstName} ${leadWithRelationships.lastName}`,
                    relationships: relationships
                },
                suggestion: 'Supprimez d\'abord les données liées (missions, devis, etc.) ou archivez le lead au lieu de le supprimer.',
                details: {
                    missions: leadWithRelationships.missions,
                    quotes: leadWithRelationships.quotes,
                    subscription: leadWithRelationships.subscription,
                    expenseCount: leadWithRelationships.expenses.length
                }
            }, { status: 409 }); // 409 Conflict
        }

        // If no blocking relationships, safe to delete
        // First delete activities (they don't prevent deletion but should be cleaned up)
        if (leadWithRelationships.activities.length > 0) {
            await prisma.activity.deleteMany({
                where: { leadId: id }
            });
            console.log('✅ Cleaned up', leadWithRelationships.activities.length, 'activities');
        }

        // Now delete the lead
        await prisma.lead.delete({
            where: { id }
        });

        console.log('✅ Successfully deleted lead:', id);
        return new NextResponse(null, { status: 204 }); // No Content

    } catch (error) {
        console.error(`Failed to delete lead:`, error);
        
        // Handle specific Prisma errors
        if (error && typeof error === 'object' && 'code' in error && error.code === 'P2003') {
            return NextResponse.json({
                error: 'FOREIGN_KEY_CONSTRAINT',
                message: 'Ce lead ne peut pas être supprimé car il est lié à d\'autres données.',
                suggestion: 'Supprimez d\'abord les missions, devis, abonnements et dépenses liés.'
            }, { status: 409 });
        }
        
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}