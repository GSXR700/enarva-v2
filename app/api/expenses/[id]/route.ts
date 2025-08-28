// app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await params for Next.js 15
        const body = await request.json();
        const { amount, ...data } = body;
        
        const updatedExpense = await prisma.expense.update({
            where: { id },
            data: {
                ...data,
                amount: amount ? new Decimal(amount) : undefined,
                date: data.date ? new Date(data.date) : undefined,
            },
        });
        return NextResponse.json(updatedExpense);
    } catch (error) {
        console.error('Failed to update expense:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params; // Await params for Next.js 15
        
        await prisma.expense.delete({
            where: { id },
        });
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Failed to delete expense:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}