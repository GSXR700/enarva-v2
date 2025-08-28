// app/api/quotes/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

/**
 * GET /api/quotes/[id]
 * Fetches a single quote by its ID, including the related lead.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await params for Next.js 15
        
        const quote = await prisma.quote.findUnique({ 
            where: { id },
            include: { lead: true }
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

/**
 * PATCH /api/quotes/[id]
 * Updates a specific quote.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await params for Next.js 15
        const body = await request.json();
        
        // Prepare data for Prisma, ensuring correct types and handling nulls
        const updateData = {
            ...body,
            surface: body.surface ? parseInt(body.surface, 10) : undefined,
            levels: body.levels ? parseInt(body.levels, 10) : undefined,
            distance: body.distance ? parseInt(body.distance, 10) : undefined,
            finalPrice: body.finalPrice ? new Decimal(body.finalPrice) : undefined,
            propertyType: body.propertyType || null, // Ensure empty strings become null
        };
        
        // Remove fields that should not be updated
        delete updateData.id;
        delete updateData.leadId;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.lead;

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: updateData,
        });
        return NextResponse.json(updatedQuote);
    } catch (error) {
        console.error(`Failed to update quote:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

/**
 * DELETE /api/quotes/[id]
 * Deletes a specific quote.
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await params for Next.js 15
        
        await prisma.quote.delete({
            where: { id },
        });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`Failed to delete quote:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}