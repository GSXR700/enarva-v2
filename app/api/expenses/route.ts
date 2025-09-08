// app/api/expenses/route.ts - FIXED VERSION
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { auth } from 'next-auth';
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
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('📥 Received expense data:', body);
    console.log('👤 Current user ID from session:', session.user.id);

    const { amount, date, rentalStartDate, rentalEndDate, missionId, leadId, ...restData } = body;

    // ✅ FIXED: Clean user handling
    // Remove any userId from the body to prevent conflicts
    const { userId: bodyUserId, ...cleanData } = restData;

    // ✅ FIXED: Verify user exists in database
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!userExists) {
      console.error('❌ User not found in database:', session.user.id);
      return new NextResponse('User not found', { status: 400 });
    }

    console.log('✅ User exists in database:', userExists.name);

    // Sanitize the data: convert empty strings to null for optional relations and dates
    const sanitizedData = {
      ...cleanData,
      amount: new Decimal(amount),
      date: new Date(date),
      userId: session.user.id, // ✅ FIXED: Use verified session user ID
      rentalStartDate: rentalStartDate ? new Date(rentalStartDate) : null,
      rentalEndDate: rentalEndDate ? new Date(rentalEndDate) : null,
      missionId: missionId || null,
      leadId: leadId || null,
    };

    console.log('🔧 Final data for creation:', {
      ...sanitizedData,
      amount: sanitizedData.amount.toString() // Log decimal as string for readability
    });

    const newExpense = await prisma.expense.create({
      data: sanitizedData,
      include: {
        mission: { select: { missionNumber: true } },
        lead: { select: { firstName: true, lastName: true } },
        user: { select: { name: true } },
      }
    });

    console.log('✅ Expense created successfully:', newExpense.id);
    return NextResponse.json(newExpense, { status: 201 });

  } catch (error) {
    console.error('❌ Failed to create expense:', error);
    
    // Enhanced error handling
    if (error && typeof error === 'object' && 'code' in error) {
      switch (error.code) {
        case 'P2003':
          return NextResponse.json({
            error: 'FOREIGN_KEY_CONSTRAINT',
            message: 'Invalid reference to user, mission, or lead. Please check your data.',
            details: error
          }, { status: 400 });
        case 'P2002':
          return NextResponse.json({
            error: 'UNIQUE_CONSTRAINT',
            message: 'A record with these details already exists.',
          }, { status: 409 });
        default:
          return NextResponse.json({
            error: 'DATABASE_ERROR',
            message: 'Database operation failed.',
            code: error.code
          }, { status: 500 });
      }
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}