// app/api/expenses/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
    const { amount, date, rentalStartDate, rentalEndDate, missionId, leadId, ...data } = body;

    // Sanitize the data: convert empty strings to null for optional relations and dates
    const sanitizedData = {
      ...data,
      amount: new Decimal(amount),
      date: new Date(date),
      userId: session.user.id, // Always use the secure session ID
      rentalStartDate: rentalStartDate ? new Date(rentalStartDate) : null,
      rentalEndDate: rentalEndDate ? new Date(rentalEndDate) : null,
      missionId: missionId || null,
      leadId: leadId || null,
    };
    
    // Explicitly remove userId from the sanitized data if it was passed in the body
    // to avoid any potential conflicts, ensuring only the session's userId is used.
    if ('userId' in sanitizedData) {
      // @ts-ignore
      delete sanitizedData.userId;
    }
    
    const finalData = {
      ...sanitizedData,
      userId: session.user.id,
    }

    const newExpense = await prisma.expense.create({
      data: finalData,
    });
    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}