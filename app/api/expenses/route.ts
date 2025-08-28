// app/api/expenses/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Correction de l'importation

const prisma = new PrismaClient();

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        mission: { select: { missionNumber: true } },
        lead: { select: { firstName: true, lastName: true } },
        user: { select: { name: true } },
      },
      orderBy: {
        date: 'desc',
      },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Failed to fetch expenses:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    const body = await request.json();
    const { amount, ...data } = body;
    const newExpense = await prisma.expense.create({
      data: {
        ...data,
        amount: new Decimal(amount),
        date: new Date(data.date),
        userId: session.user.id,
      },
    });
    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
