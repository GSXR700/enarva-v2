// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/api/quotes/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function GET(
  request: Request, 
  context: { params: { id: string } }
) {
    try {
        const { id } = context.params;
        
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

export async function PATCH(
  request: Request, 
  context: { params: { id: string } }
) {
    try {
        const { id } = context.params;
        const body = await request.json();
        
        const { lineItems, subTotalHT, vatAmount, totalTTC, finalPrice, status, type, expiresAt } = body;

        const dataToUpdate: any = {};

        if (lineItems) dataToUpdate.lineItems = lineItems;
        if (subTotalHT !== undefined) dataToUpdate.subTotalHT = new Decimal(subTotalHT);
        if (vatAmount !== undefined) dataToUpdate.vatAmount = new Decimal(vatAmount);
        if (totalTTC !== undefined) dataToUpdate.totalTTC = new Decimal(totalTTC);
        if (finalPrice !== undefined) dataToUpdate.finalPrice = new Decimal(finalPrice);
        if (status) dataToUpdate.status = status;
        if (type) dataToUpdate.type = type;
        if (expiresAt) dataToUpdate.expiresAt = new Date(expiresAt);

        if (Object.keys(dataToUpdate).length === 0) {
            return new NextResponse('No update data provided', { status: 400 });
        }

        const updatedQuote = await prisma.quote.update({
            where: { id },
            data: dataToUpdate,
        });
        return NextResponse.json(updatedQuote);
    } catch (error) {
        console.error(`Failed to update quote:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
  request: Request, 
  context: { params: { id: string } }
) {
    try {
        const { id } = context.params;
        
        await prisma.quote.delete({
            where: { id },
        });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`Failed to delete quote:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}