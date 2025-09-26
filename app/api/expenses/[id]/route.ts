// app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// GET /api/expenses/[id] - Fetch a specific expense by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    console.log(`🔄 Fetching expense with ID: ${id}`);

    if (!id) {
      return NextResponse.json({
        error: 'MISSING_ID',
        message: 'Expense ID is required'
      }, { status: 400 });
    }

    const expense = await prisma.expense.findUnique({ 
      where: { id },
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
      }
    });
    
    if (!expense) {
      return NextResponse.json({
        error: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      }, { status: 404 });
    }

    console.log(`✅ Found expense: ${expense.subCategory} - ${expense.amount} MAD`);
    return NextResponse.json(expense);

  } catch (error) {
    console.error('❌ Failed to fetch expense:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        error: 'DATABASE_ERROR',
        message: 'Database error occurred while fetching expense',
        code: error.code
      }, { status: 500 });
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH /api/expenses/[id] - Update a specific expense
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    
    console.log(`🔄 Updating expense with ID: ${id}`, body);

    if (!id) {
      return NextResponse.json({
        error: 'MISSING_ID',
        message: 'Expense ID is required'
      }, { status: 400 });
    }

    // Check if expense exists
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      select: { id: true, userId: true }
    });

    if (!existingExpense) {
      return NextResponse.json({
        error: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      }, { status: 404 });
    }

    // Extract fields from request body
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
      missionId
    } = body;

    // Prepare update data object
    const updateData: any = {};

    // Validate and update date if provided
    if (date !== undefined) {
      const expenseDate = new Date(date);
      if (isNaN(expenseDate.getTime())) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid date format'
        }, { status: 400 });
      }
      updateData.date = expenseDate;
    }

    // Validate and update amount if provided
    if (amount !== undefined) {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Amount must be a positive number'
        }, { status: 400 });
      }
      updateData.amount = new Decimal(numericAmount);
    }

    // Update category if provided
    if (category !== undefined) {
      updateData.category = category;
    }

    // Update subCategory if provided
    if (subCategory !== undefined) {
      updateData.subCategory = subCategory;
    }

    // Update paymentMethod if provided
    if (paymentMethod !== undefined) {
      updateData.paymentMethod = paymentMethod;
    }

    // Update vendor (handle empty strings as null)
    if (vendor !== undefined) {
      updateData.vendor = vendor && vendor.trim() !== '' ? vendor.trim() : null;
    }

    // Update description (handle empty strings as null)
    if (description !== undefined) {
      updateData.description = description && description.trim() !== '' ? description.trim() : null;
    }

    // Update proofUrl (handle empty strings as null)
    if (proofUrl !== undefined) {
      updateData.proofUrl = proofUrl && proofUrl.trim() !== '' ? proofUrl.trim() : null;
    }

    // Validate and update mission if provided
    if (missionId !== undefined) {
      if (missionId === null || missionId === '' || missionId === 'none') {
        updateData.missionId = null;
        console.log('✅ Expense will be unlinked from mission (general expense)');
      } else {
        const mission = await prisma.mission.findUnique({
          where: { id: missionId },
          select: { id: true, missionNumber: true }
        });
        
        if (!mission) {
          return NextResponse.json({
            error: 'MISSION_NOT_FOUND',
            message: 'Selected mission does not exist'
          }, { status: 400 });
        }
        
        updateData.missionId = missionId;
        console.log(`✅ Expense will be linked to mission: ${mission.missionNumber}`);
      }
    }

    // Handle rental dates for LOCATIONS category
    if (rentalStartDate !== undefined) {
      if (rentalStartDate === null || rentalStartDate === '') {
        updateData.rentalStartDate = null;
      } else {
        const startDate = new Date(rentalStartDate);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid rental start date'
          }, { status: 400 });
        }
        updateData.rentalStartDate = startDate;
      }
    }

    if (rentalEndDate !== undefined) {
      if (rentalEndDate === null || rentalEndDate === '') {
        updateData.rentalEndDate = null;
      } else {
        const endDate = new Date(rentalEndDate);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid rental end date'
          }, { status: 400 });
        }
        updateData.rentalEndDate = endDate;
      }
    }

    // Validate rental dates if both are provided
    if (updateData.rentalStartDate && updateData.rentalEndDate) {
      if (updateData.rentalStartDate >= updateData.rentalEndDate) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Rental end date must be after start date'
        }, { status: 400 });
      }
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: 'NO_CHANGES',
        message: 'No changes provided to update'
      }, { status: 400 });
    }

    console.log('🔧 Updating expense with data:', {
      ...updateData,
      amount: updateData.amount ? updateData.amount.toString() : undefined
    });

    // Perform the update
    const updatedExpense = await prisma.expense.update({
      where: { id },
      data: updateData,
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

    console.log(`✅ Expense updated successfully: ${updatedExpense.id}`);
    
    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully',
      expense: updatedExpense
    });

  } catch (error) {
    console.error('❌ Failed to update expense:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2003':
          return NextResponse.json({
            error: 'FOREIGN_KEY_CONSTRAINT',
            message: 'Invalid reference to user or mission. Please check your data.',
            details: error.meta
          }, { status: 400 });
        case 'P2025':
          return NextResponse.json({
            error: 'EXPENSE_NOT_FOUND',
            message: 'Expense not found for update'
          }, { status: 404 });
        default:
          return NextResponse.json({
            error: 'DATABASE_ERROR',
            message: 'A database error occurred while updating the expense.',
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

// DELETE /api/expenses/[id] - Delete a specific expense
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    console.log(`🔄 Deleting expense with ID: ${id}`);

    if (!id) {
      return NextResponse.json({
        error: 'MISSING_ID',
        message: 'Expense ID is required'
      }, { status: 400 });
    }

    // Check if expense exists before deletion
    const existingExpense = await prisma.expense.findUnique({
      where: { id },
      select: { 
        id: true, 
        subCategory: true, 
        amount: true,
        user: {
          select: { name: true }
        }
      }
    });

    if (!existingExpense) {
      return NextResponse.json({
        error: 'EXPENSE_NOT_FOUND',
        message: 'Expense not found'
      }, { status: 404 });
    }

    // Delete the expense
    await prisma.expense.delete({ 
      where: { id } 
    });

    console.log(`✅ Expense deleted successfully: ${existingExpense.subCategory} - ${existingExpense.amount} MAD by ${existingExpense.user.name}`);
    
    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('❌ Failed to delete expense:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2025':
          return NextResponse.json({
            error: 'EXPENSE_NOT_FOUND',
            message: 'Expense not found for deletion'
          }, { status: 404 });
        default:
          return NextResponse.json({
            error: 'DATABASE_ERROR',
            message: 'A database error occurred while deleting the expense.',
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