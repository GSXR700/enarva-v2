// app/api/quotes/[id]/route.ts - Updated to handle lead updates
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, QuoteStatus, QuoteType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { z } from 'zod';

const prisma = new PrismaClient();

// Zod schema for PATCH validation
const quoteUpdateSchema = z.object({
  lineItems: z.array(z.any()).optional(),
  subTotalHT: z.number().optional(),
  vatAmount: z.number().optional(),
  totalTTC: z.number().optional(),
  finalPrice: z.number().optional(),
  status: z.nativeEnum(QuoteStatus).optional(),
  type: z.nativeEnum(QuoteType).optional(),
  surface: z.number().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  leadUpdates: z.object({
    // Define lead properties that can be updated
    name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
}).optional().transform(val => val === undefined ? undefined : val),
  // Use passthrough to allow other fields from the body
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
        
        const validatedData = quoteUpdateSchema.parse(body);

        const {
            subTotalHT,
            vatAmount,
            totalTTC,
            finalPrice,
            expiresAt,
            leadUpdates,
            ...otherQuoteData
        } = validatedData;

        const dataToUpdate: any = { ...otherQuoteData };
        if (subTotalHT) dataToUpdate.subTotalHT = new Decimal(subTotalHT);
        if (vatAmount) dataToUpdate.vatAmount = new Decimal(vatAmount);
        if (totalTTC) dataToUpdate.totalTTC = new Decimal(totalTTC);
        if (finalPrice) dataToUpdate.finalPrice = new Decimal(finalPrice);
        if (expiresAt) dataToUpdate.expiresAt = new Date(expiresAt);

        // Update quote
        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: dataToUpdate,
            include: { lead: true }
        });

        // Update related lead if leadUpdates provided
        if (leadUpdates && updatedQuote.leadId) {
            // Filter out undefined values for strict mode compatibility
            const cleanLeadUpdates = Object.fromEntries(
                Object.entries(leadUpdates).filter(([_, value]) => value !== undefined)
            );

    if (Object.keys(cleanLeadUpdates).length > 0) {
        await prisma.lead.update({
            where: { id: updatedQuote.leadId },
            data: cleanLeadUpdates
        });
    }
}

        return NextResponse.json(updatedQuote);

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
        }
        console.error(`Failed to update quote:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
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