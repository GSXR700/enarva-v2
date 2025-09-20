// app/api/quotes/[id]/route.ts - FIXED VERSION
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, QuoteStatus, QuoteType, LeadStatus, ActivityType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

const prisma = new PrismaClient();

// Enhanced schema for PATCH validation
const quoteUpdateSchema = z.object({
  lineItems: z.array(z.any()).optional(),
  subTotalHT: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  vatAmount: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  totalTTC: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  finalPrice: z.union([z.number(), z.string().transform(val => parseFloat(val))]).optional(),
  status: z.nativeEnum(QuoteStatus).optional(),
  type: z.nativeEnum(QuoteType).optional(),
  surface: z.number().optional().nullable(),
  levels: z.number().optional().nullable(),
  propertyType: z.string().optional().nullable(),
  productCategory: z.string().optional().nullable(),
  productDetails: z.any().optional().nullable(),
  deliveryType: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
  expiresAt: z.union([
    z.string().datetime(),
    z.string().transform(val => new Date(val)),
    z.date(),
    z.null()
  ]).optional(),
  leadUpdates: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional(),
    address: z.string().optional().nullable(),
    company: z.string().optional().nullable(),
  }).optional(),
}).passthrough();

export async function GET(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { id } = await params;
        
        const quote = await prisma.quote.findUnique({ 
            where: { id },
            include: { 
                lead: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        company: true,
                        leadType: true,
                        address: true,
                        status: true,
                        propertyType: true,
                    }
                },
                missions: {
                    select: {
                        id: true,
                        missionNumber: true,
                        status: true,
                        scheduledDate: true,
                        teamLeader: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    },
                    orderBy: { scheduledDate: 'desc' }
                }
            }
        });

        if (!quote) {
            return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
        }

        // Convert Decimal fields to numbers for JSON serialization
        const serializedQuote = {
            ...quote,
            subTotalHT: quote.subTotalHT.toNumber(),
            vatAmount: quote.vatAmount.toNumber(),
            totalTTC: quote.totalTTC.toNumber(),
            finalPrice: quote.finalPrice.toNumber(),
        };

        return NextResponse.json(serializedQuote);
    } catch (error) {
        console.error('Failed to fetch quote:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { id } = await params;
        const currentUserId = session.user.id;
        const body = await request.json();
        
        console.log('Updating quote with data:', body);

        let validatedData;
        try {
            validatedData = quoteUpdateSchema.parse(body);
        } catch (validationError) {
            if (validationError instanceof z.ZodError) {
                console.error('Validation failed:', validationError.flatten().fieldErrors);
                return NextResponse.json(
                    { error: 'Validation failed', details: validationError.flatten().fieldErrors },
                    { status: 400 }
                );
            }
            throw validationError;
        }

        // Execute update in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check if quote exists
            const existingQuote = await tx.quote.findUnique({
                where: { id },
                include: { lead: true }
            });

            if (!existingQuote) {
                throw new Error('Quote not found');
            }

            // Prepare quote update data
            const {
                leadUpdates,
                subTotalHT,
                vatAmount,
                totalTTC,
                finalPrice,
                expiresAt,
                ...otherQuoteData
            } = validatedData;

            const quoteUpdateData: any = { ...otherQuoteData };

            // Convert Decimal fields
            if (subTotalHT !== undefined) {
                quoteUpdateData.subTotalHT = new Decimal(subTotalHT);
            }
            if (vatAmount !== undefined) {
                quoteUpdateData.vatAmount = new Decimal(vatAmount);
            }
            if (totalTTC !== undefined) {
                quoteUpdateData.totalTTC = new Decimal(totalTTC);
            }
            if (finalPrice !== undefined) {
                quoteUpdateData.finalPrice = new Decimal(finalPrice);
            }

            // Handle expiration date
            if (expiresAt !== undefined) {
                quoteUpdateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
            }

            // Update the quote
            const updatedQuote = await tx.quote.update({
                where: { id },
                data: {
                    ...quoteUpdateData,
                    updatedAt: new Date()
                },
                include: {
                    lead: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                            company: true,
                            leadType: true,
                            address: true,
                            status: true,
                        }
                    },
                    missions: {
                        select: {
                            id: true,
                            missionNumber: true,
                            status: true,
                            scheduledDate: true,
                        }
                    }
                }
            });

            // Update lead if leadUpdates provided
            if (leadUpdates && Object.keys(leadUpdates).length > 0) {
                const cleanLeadUpdates = Object.fromEntries(
                    Object.entries(leadUpdates).filter(([_, value]) => value !== undefined)
                );

                if (Object.keys(cleanLeadUpdates).length > 0) {
                    await tx.lead.update({
                        where: { id: existingQuote.leadId },
                        data: {
                            ...cleanLeadUpdates,
                            updatedAt: new Date()
                        }
                    });
                    console.log('Updated lead information');
                }
            }

            // Handle status changes and lead status updates
            if (quoteUpdateData.status && quoteUpdateData.status !== existingQuote.status) {
                let newLeadStatus: LeadStatus | null = null;

                switch (quoteUpdateData.status) {
                    case 'SENT':
                        newLeadStatus = LeadStatus.QUOTE_SENT;
                        break;
                    case 'ACCEPTED':
                        newLeadStatus = LeadStatus.QUOTE_ACCEPTED;
                        break;
                    case 'REJECTED':
                    case 'REFUSED':
                        newLeadStatus = LeadStatus.QUOTE_REFUSED;
                        break;
                }

                // Update lead status if needed
                if (newLeadStatus && existingQuote.lead.status !== newLeadStatus) {
                    await tx.lead.update({
                        where: { id: existingQuote.leadId },
                        data: { 
                            status: newLeadStatus,
                            updatedAt: new Date()
                        }
                    });
                    console.log(`Updated lead status to ${newLeadStatus}`);
                }

                // Create activity for status change
                if (currentUserId) {
                    try {
                        await tx.activity.create({
                            data: {
                                type: ActivityType.QUOTE_GENERATED,
                                title: `Devis ${existingQuote.quoteNumber} mis à jour`,
                                description: `Statut du devis changé de ${existingQuote.status} vers ${quoteUpdateData.status}`,
                                userId: currentUserId,
                                leadId: existingQuote.leadId,
                                metadata: {
                                    quoteId: id,
                                    oldStatus: existingQuote.status,
                                    newStatus: quoteUpdateData.status,
                                    amount: updatedQuote.finalPrice.toString()
                                }
                            }
                        });
                        console.log('Created activity for quote status change');
                    } catch (activityError) {
                        console.warn('Failed to create activity:', activityError);
                    }
                }
            }

            return updatedQuote;
        });

        // Convert Decimal fields to numbers for JSON response
        const serializedResult = {
            ...result,
            subTotalHT: result.subTotalHT.toNumber(),
            vatAmount: result.vatAmount.toNumber(),
            totalTTC: result.totalTTC.toNumber(),
            finalPrice: result.finalPrice.toNumber(),
        };

        console.log('Quote updated successfully:', id);
        return NextResponse.json(serializedResult);

    } catch (error) {
        console.error('Failed to update quote:', error);
        
        if (error instanceof Error) {
            return NextResponse.json({ 
                error: 'Failed to update quote', 
                message: error.message 
            }, { status: 500 });
        }
        
        return NextResponse.json({ 
            error: 'Internal Server Error' 
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

export async function DELETE(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        // Check if user has admin privileges for deletion
        const user = session.user as any;
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { id } = await params;
        const currentUserId = session.user.id;

        // Execute deletion in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // First, verify the quote exists and get its details
            const existingQuote = await tx.quote.findUnique({
                where: { id },
                include: { 
                    lead: {
                        select: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        }
                    },
                    missions: {
                        select: { id: true }
                    }
                }
            });

            if (!existingQuote) {
                throw new Error('Quote not found');
            }

            // Check if quote has associated missions
            if (existingQuote.missions.length > 0) {
                throw new Error('Cannot delete quote with associated missions');
            }

            // Delete the quote
            await tx.quote.delete({
                where: { id }
            });

            // Create activity for deletion
            if (currentUserId) {
                try {
                    await tx.activity.create({
                        data: {
                            type: ActivityType.QUOTE_GENERATED,
                            title: `Devis ${existingQuote.quoteNumber} supprimé`,
                            description: `Devis supprimé pour ${existingQuote.lead.firstName} ${existingQuote.lead.lastName}`,
                            userId: currentUserId,
                            leadId: existingQuote.leadId,
                            metadata: {
                                deletedQuoteId: id,
                                quoteNumber: existingQuote.quoteNumber,
                                amount: existingQuote.finalPrice.toString()
                            }
                        }
                    });
                    console.log('Created activity for quote deletion');
                } catch (activityError) {
                    console.warn('Failed to create deletion activity:', activityError);
                }
            }

            return { success: true, quoteNumber: existingQuote.quoteNumber };
        });

        console.log('Quote deleted successfully:', id);
        return NextResponse.json(result);

    } catch (error) {
        console.error('Failed to delete quote:', error);
        
        if (error instanceof Error) {
            return NextResponse.json({ 
                error: 'Failed to delete quote', 
                message: error.message
            }, { status: 500 });
        }
        
        return NextResponse.json({ 
            error: 'Internal Server Error' 
        }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}