// app/api/quotes/[id]/route.ts - Updated to handle lead updates
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function GET(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const quote = await prisma.quote.findUnique({ 
            where: { id },
            include: { lead: true, missions: true }
        });

        if (!quote) {
            return new NextResponse('Quote not found', { status: 404 });
        }
        return NextResponse.json(quote);
    } catch (error) {
        console.error(`Failed to fetch quote:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
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
        const body = await request.json();
        
        // Separate quote data from lead updates
        const {
            lineItems,
            subTotalHT,
            vatAmount,
            totalTTC,
            finalPrice,
            status,
            type,
            surface,
            expiresAt,
            leadUpdates,
            ...otherQuoteData
        } = body;

        // Prepare quote update data
        const dataToUpdate: any = {};

        if (lineItems) dataToUpdate.lineItems = lineItems;
        if (subTotalHT !== undefined) dataToUpdate.subTotalHT = new Decimal(subTotalHT);
        if (vatAmount !== undefined) dataToUpdate.vatAmount = new Decimal(vatAmount);
        if (totalTTC !== undefined) dataToUpdate.totalTTC = new Decimal(totalTTC);
        if (finalPrice !== undefined) dataToUpdate.finalPrice = new Decimal(finalPrice);
        if (status) dataToUpdate.status = status;
        if (type) dataToUpdate.type = type;
        if (surface !== undefined) dataToUpdate.surface = surface;
        if (expiresAt) dataToUpdate.expiresAt = new Date(expiresAt);

        // Add other quote data
        Object.keys(otherQuoteData).forEach(key => {
            if (otherQuoteData[key] !== undefined) {
                dataToUpdate[key] = otherQuoteData[key];
            }
        });

        if (Object.keys(dataToUpdate).length === 0 && !leadUpdates) {
            return new NextResponse('No update data provided', { status: 400 });
        }

        // Update quote
        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: dataToUpdate,
            include: {
                lead: true
            }
        });

        // Update lead if leadUpdates provided
        if (leadUpdates && updatedQuote.leadId) {
            const cleanedLeadUpdates = Object.fromEntries(
                Object.entries(leadUpdates).filter(([_, value]) => 
                    value !== undefined && value !== '' && value !== null
                )
            );

            if (Object.keys(cleanedLeadUpdates).length > 0) {
                // Convert string numbers to actual numbers for numeric fields
                if (cleanedLeadUpdates.estimatedSurface) {
                    cleanedLeadUpdates.estimatedSurface = parseInt(cleanedLeadUpdates.estimatedSurface as string);
                }

                await prisma.lead.update({
                    where: { id: updatedQuote.leadId },
                    data: cleanedLeadUpdates
                });

                // Fetch updated quote with refreshed lead data
                const finalQuote = await prisma.quote.findUnique({
                    where: { id },
                    include: { lead: true, missions: true }
                });

                return NextResponse.json(finalQuote);
            }
        }

        return NextResponse.json(updatedQuote);
    } catch (error) {
        console.error(`Failed to update quote:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const { id } = await params;
        
        // Check if quote has associated missions
        const missionsCount = await prisma.mission.count({
            where: { quoteId: id }
        });

        if (missionsCount > 0) {
            return new NextResponse(
                `Cannot delete quote. It is linked to ${missionsCount} mission(s).`, 
                { status: 409 }
            );
        }

        await prisma.quote.delete({
            where: { id },
        });
        
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`Failed to delete quote:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}