// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/api/expenses/[id]/route.ts
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
        mission: { select: { missionNumber: true } },
        lead: { select: { firstName: true, lastName: true } },
        user: { select: { name: true } },
      }
    });

    if (!expense) {
      return new NextResponse('Expense not found', { status: 404 });
    }
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
    
    if (body.amount) {
      body.amount = new Decimal(body.amount);
    }

    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: body,
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
    await prisma.expense.delete({
      where: { id },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}