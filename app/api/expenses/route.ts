// app/api/expenses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// GET /api/expenses - Fetch all expenses with details
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('🔄 Fetching expenses...');

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const paymentMethod = searchParams.get('paymentMethod');
    const userId = searchParams.get('userId');
    const missionId = searchParams.get('missionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build where clause for filtering
    const where: Prisma.ExpenseWhereInput = {};
    
    // Category filter
    if (category && category !== 'ALL') {
      where.category = category as any;
    }
    
    // Payment method filter
    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod as any;
    }
    
    // User filter
    if (userId) {
      where.userId = userId;
    }
    
    // Mission filter
    if (missionId) {
      where.missionId = missionId;
    }
    
    // Date range filter
    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }
    
    // Search filter (across multiple fields)
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        { subCategory: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { vendor: { contains: searchTerm, mode: 'insensitive' } },
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { 
          mission: { 
            OR: [
              { missionNumber: { contains: searchTerm, mode: 'insensitive' } },
              { address: { contains: searchTerm, mode: 'insensitive' } }
            ]
          } 
        }
      ];
    }

    // Build orderBy clause
    let orderBy: Prisma.ExpenseOrderByWithRelationInput = {};
    if (sortBy === 'date') {
      orderBy.date = sortOrder as 'asc' | 'desc';
    } else if (sortBy === 'amount') {
      orderBy.amount = sortOrder as 'asc' | 'desc';
    } else if (sortBy === 'category') {
      orderBy.category = sortOrder as 'asc' | 'desc';
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder as 'asc' | 'desc';
    } else {
      orderBy.date = 'desc'; // default
    }

    // Get total count for pagination
    const totalCount = await prisma.expense.count({ where });

    // Fetch expenses with relations
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        mission: {
          select: {
            id: true,
            missionNumber: true,
            address: true,
            scheduledDate: true,
            status: true,
            type: true,
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              }
            }
          },
        },
      },
      orderBy,
      take: limit,
      skip: offset,
    });

    console.log(`✅ Fetched ${expenses.length} expenses out of ${totalCount} total`);

    return NextResponse.json({
      expenses,
      totalCount,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
      limit,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0
    });

  } catch (error) {
    console.error('❌ Failed to fetch expenses:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        error: 'DATABASE_ERROR',
        message: 'Database error occurred while fetching expenses',
        code: error.code
      }, { status: 500 });
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/expenses - Create a new expense
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('🔄 Creating expense with data:', body);

    // Extract and validate required fields
    const {
      date,
      amount,
      category,
      subCategory,
      paymentMethod,
      vendor,
      description,
      proofUrl,
      rentalStartDate,
      rentalEndDate,
      missionId,
      userId
    } = body;

    // Basic validation
    if (!date || !amount || !category || !subCategory || !paymentMethod || !userId) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields',
        requiredFields: ['date', 'amount', 'category', 'subCategory', 'paymentMethod', 'userId']
      }, { status: 400 });
    }

    // Validate amount is a positive number
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Amount must be a positive number'
      }, { status: 400 });
    }

    // Validate date
    const expenseDate = new Date(date);
    if (isNaN(expenseDate.getTime())) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid date format'
      }, { status: 400 });
    }

    // Ensure user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({
        error: 'USER_NOT_FOUND',
        message: 'User does not exist'
      }, { status: 400 });
    }

    // Validate mission if provided (optional)
    let validatedMissionId = null;
    if (missionId && missionId !== '' && missionId !== 'none') {
      const mission = await prisma.mission.findUnique({
        where: { id: missionId },
        select: { id: true, missionNumber: true, leadId: true }
      });
      
      if (!mission) {
        return NextResponse.json({
          error: 'MISSION_NOT_FOUND',
          message: 'Selected mission does not exist'
        }, { status: 400 });
      }
      
      validatedMissionId = missionId;
      console.log(`✅ Expense will be linked to mission: ${mission.missionNumber}`);
    } else {
      console.log('✅ Expense will be created without mission link (general expense)');
    }

    // Validate rental dates if category is LOCATIONS
    let validatedRentalStartDate = null;
    let validatedRentalEndDate = null;
    
    if (category === 'LOCATIONS') {
      if (rentalStartDate) {
        validatedRentalStartDate = new Date(rentalStartDate);
        if (isNaN(validatedRentalStartDate.getTime())) {
          return NextResponse.json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid rental start date'
          }, { status: 400 });
        }
      }
      
      if (rentalEndDate) {
        validatedRentalEndDate = new Date(rentalEndDate);
        if (isNaN(validatedRentalEndDate.getTime())) {
          return NextResponse.json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid rental end date'
          }, { status: 400 });
        }
      }
      
      // Check that end date is after start date
      if (validatedRentalStartDate && validatedRentalEndDate && validatedRentalStartDate >= validatedRentalEndDate) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Rental end date must be after start date'
        }, { status: 400 });
      }
    }

    // Prepare data for creation
    const expenseData = {
      date: expenseDate,
      amount: new Decimal(numericAmount),
      category,
      subCategory,
      paymentMethod,
      vendor: vendor && vendor.trim() !== '' ? vendor.trim() : null,
      description: description && description.trim() !== '' ? description.trim() : null,
      proofUrl: proofUrl && proofUrl.trim() !== '' ? proofUrl.trim() : null,
      userId,
      missionId: validatedMissionId,
      rentalStartDate: validatedRentalStartDate,
      rentalEndDate: validatedRentalEndDate,
    };

    console.log('🔧 Creating expense with sanitized data:', {
      ...expenseData,
      amount: expenseData.amount.toString()
    });

    // Create the expense
    const newExpense = await prisma.expense.create({
      data: expenseData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        mission: {
          select: {
            id: true,
            missionNumber: true,
            address: true,
            scheduledDate: true,
            status: true,
            lead: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              }
            }
          },
        },
      }
    });

    console.log(`✅ Expense created successfully with ID: ${newExpense.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Expense created successfully',
      expense: newExpense
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Failed to create expense:', error);
    
    // Handle Prisma-specific errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2003':
          return NextResponse.json({
            error: 'FOREIGN_KEY_CONSTRAINT',
            message: 'Invalid reference to user or mission. Please check your data.',
            details: error.meta
          }, { status: 400 });
        case 'P2002':
          return NextResponse.json({
            error: 'UNIQUE_CONSTRAINT_VIOLATION',
            message: 'A record with this information already exists.'
          }, { status: 409 });
        default:
          return NextResponse.json({
            error: 'DATABASE_ERROR',
            message: 'A database error occurred while creating the expense.',
            code: error.code
          }, { status: 500 });
      }
    }
    
    return NextResponse.json({
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
