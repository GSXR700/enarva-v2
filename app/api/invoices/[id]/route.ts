// app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function GET(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        const invoice = await prisma.invoice.findUnique({ 
            where: { id },
            include: { 
                lead: true,
                mission: true
            }
        });

        if (!invoice) {
            return new NextResponse('Invoice not found', { status: 404 });
        }
        return NextResponse.json(invoice);
    } catch (error) {
        console.error(`Failed to fetch invoice:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function PATCH(
  request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        
        const { status, amount, dueDate, paidAt, paymentMethod, notes } = body;

        const dataToUpdate: any = {};

        if (status) dataToUpdate.status = status;
        if (amount !== undefined) dataToUpdate.amount = new Decimal(amount);
        if (dueDate) dataToUpdate.dueDate = new Date(dueDate);
        if (paidAt) dataToUpdate.paidAt = new Date(paidAt);
        if (paymentMethod) dataToUpdate.paymentMethod = paymentMethod;
        if (notes !== undefined) dataToUpdate.notes = notes;

        if (Object.keys(dataToUpdate).length === 0) {
            return new NextResponse('No update data provided', { status: 400 });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: dataToUpdate,
        });
        return NextResponse.json(updatedInvoice);
    } catch (error) {
        console.error(`Failed to update invoice:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        
        await prisma.invoice.delete({
            where: { id },
        });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error(`Failed to delete invoice:`, error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}