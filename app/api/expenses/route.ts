// app/api/expenses/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const expenses = await prisma.expense.findMany({
      include: {
        mission: { select: { missionNumber: true } },
        lead: { select: { firstName: true, lastName: true } },
        user: { select: { name: true } }, // Agent concerné
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
    const { amount, description, category, subCategory, paymentMethod, vendor, date, missionId, leadId, proofUrl, rentalStartDate, rentalEndDate } = body;

    if (!amount || !description || !category || !subCategory || !date || !paymentMethod) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newExpense = await prisma.expense.create({
      data: {
        amount: new Decimal(amount),
        description,
        category,
        subCategory,
        paymentMethod,
        vendor,
        date: new Date(date),
        proofUrl,
        rentalStartDate: rentalStartDate || null,
        rentalEndDate: rentalEndDate || null,
        userId: session.user.id,
        missionId: missionId || null,
        leadId: leadId || null,
      },
    });

    return NextResponse.json(newExpense, { status: 201 });
  } catch (error) {
    console.error('Failed to create expense:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}