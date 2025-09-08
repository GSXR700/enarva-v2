// app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expense = await prisma.expense.findUnique({ 
        where: { id },
        include: {
            user: true,
            mission: {
                include: {
                    lead: true
                }
            },
            lead: true
        }
    });
    if (!expense) return new NextResponse('Expense not found', { status: 404 });
    return NextResponse.json(expense);
  } catch (error) {
    console.error('Failed to fetch expense:', error);
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
    const { amount, ...rest } = body;
    
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: {
        ...rest,
        amount: amount ? new Decimal(amount) : undefined,
      },
    });
    return NextResponse.json(updatedExpense);
  } catch (error) {
    console.error('Failed to update expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.expense.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}