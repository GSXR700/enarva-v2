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
    
    // Destructure all potential fields from the body
    const {
      amount,
      date,
      rentalStartDate,
      rentalEndDate,
      missionId,
      leadId,
      ...data
    } = body;

    // Sanitize optional fields to convert empty strings to null, as Prisma expects
    const sanitizedData = {
      ...data,
      amount: new Decimal(amount),
      date: new Date(date),
      userId: session.user.id,
      // If the value is a non-empty string, create a Date object, otherwise set to null
      rentalStartDate: rentalStartDate ? new Date(rentalStartDate) : null,
      rentalEndDate: rentalEndDate ? new Date(rentalEndDate) : null,
      // If the ID is an empty string, set it to null to avoid relation errors
      missionId: missionId || null,
      leadId: leadId || null,
    };

    const newExpense = await prisma.expense.create({
      data: sanitizedData,
    });
    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}