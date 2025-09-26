// app/api/inventory/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// GET /api/inventory/[id] - Fetch a specific inventory item by ID
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
    console.log(`🔄 Fetching inventory item with ID: ${id}`);

    if (!id) {
      return NextResponse.json({
        error: 'MISSING_ID',
        message: 'Inventory item ID is required'
      }, { status: 400 });
    }

    const item = await prisma.inventory.findUnique({ 
      where: { id },
      include: {
        usages: {
          include: {
            mission: {
              select: {
                id: true,
                missionNumber: true,
                scheduledDate: true,
                status: true,
                lead: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          },
          orderBy: {
            usedAt: 'desc'
          },
          take: 10 // Limit to recent usages
        }
      }
    });
    
    if (!item) {
      return NextResponse.json({
        error: 'ITEM_NOT_FOUND',
        message: 'Inventory item not found'
      }, { status: 404 });
    }

    console.log(`✅ Found inventory item: ${item.name} - Stock: ${item.currentStock}`);
    return NextResponse.json(item);

  } catch (error) {
    console.error('❌ Failed to fetch inventory item:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        error: 'DATABASE_ERROR',
        message: 'Database error occurred while fetching inventory item',
        code: error.code
      }, { status: 500 });
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// PATCH /api/inventory/[id] - Update a specific inventory item
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
    
    console.log(`🔄 Updating inventory item with ID: ${id}`, body);

    if (!id) {
      return NextResponse.json({
        error: 'MISSING_ID',
        message: 'Inventory item ID is required'
      }, { status: 400 });
    }

    // Check if item exists
    const existingItem = await prisma.inventory.findUnique({
      where: { id },
      select: { id: true, name: true }
    });

    if (!existingItem) {
      return NextResponse.json({
        error: 'ITEM_NOT_FOUND',
        message: 'Inventory item not found'
      }, { status: 404 });
    }

    // Extract and validate fields from request body
    const {
      name,
      category,
      unit,
      currentStock,
      minimumStock,
      unitPrice,
      supplier
    } = body;

    // Prepare update data object
    const updateData: any = {};

    // Update name if provided
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Item name cannot be empty'
        }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    // Update category if provided
    if (category !== undefined) {
      const validCategories = ['CLEANING_PRODUCTS', 'EQUIPMENT', 'CONSUMABLES', 'PROTECTIVE_GEAR'];
      if (!validCategories.includes(category)) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Invalid category'
        }, { status: 400 });
      }
      updateData.category = category;
    }

    // Update unit if provided
    if (unit !== undefined) {
      if (!unit || unit.trim() === '') {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Unit cannot be empty'
        }, { status: 400 });
      }
      updateData.unit = unit.trim();
    }

    // Update currentStock if provided
    if (currentStock !== undefined) {
      const numericCurrentStock = parseFloat(currentStock);
      if (isNaN(numericCurrentStock) || numericCurrentStock < 0) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Current stock must be a non-negative number'
        }, { status: 400 });
      }
      updateData.currentStock = new Decimal(numericCurrentStock);
    }

    // Update minimumStock if provided
    if (minimumStock !== undefined) {
      const numericMinimumStock = parseFloat(minimumStock);
      if (isNaN(numericMinimumStock) || numericMinimumStock < 0) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Minimum stock must be a non-negative number'
        }, { status: 400 });
      }
      updateData.minimumStock = new Decimal(numericMinimumStock);
    }

    // Update unitPrice if provided
    if (unitPrice !== undefined) {
      const numericUnitPrice = parseFloat(unitPrice);
      if (isNaN(numericUnitPrice) || numericUnitPrice < 0) {
        return NextResponse.json({
          error: 'VALIDATION_ERROR',
          message: 'Unit price must be a non-negative number'
        }, { status: 400 });
      }
      updateData.unitPrice = new Decimal(numericUnitPrice);
    }

    // Update supplier if provided (can be null/empty)
    if (supplier !== undefined) {
      updateData.supplier = supplier && supplier.trim() !== '' ? supplier.trim() : null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        error: 'NO_CHANGES',
        message: 'No changes provided to update'
      }, { status: 400 });
    }

    console.log('🔧 Updating inventory item with data:', {
      ...updateData,
      currentStock: updateData.currentStock ? updateData.currentStock.toString() : undefined,
      minimumStock: updateData.minimumStock ? updateData.minimumStock.toString() : undefined,
      unitPrice: updateData.unitPrice ? updateData.unitPrice.toString() : undefined
    });

    // Perform the update
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: updateData,
      include: {
        usages: {
          include: {
            mission: {
              select: {
                id: true,
                missionNumber: true,
                scheduledDate: true,
                lead: {
                  select: {
                    firstName: true,
                    lastName: true,
                  }
                }
              }
            }
          },
          orderBy: {
            usedAt: 'desc'
          },
          take: 5
        }
      }
    });

    console.log(`✅ Inventory item updated successfully: ${updatedItem.name}`);
    
    return NextResponse.json({
      success: true,
      message: 'Inventory item updated successfully',
      item: updatedItem
    });

  } catch (error) {
    console.error('❌ Failed to update inventory item:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return NextResponse.json({
            error: 'DUPLICATE_ITEM',
            message: 'An item with this name already exists'
          }, { status: 409 });
        case 'P2025':
          return NextResponse.json({
            error: 'ITEM_NOT_FOUND',
            message: 'Inventory item not found for update'
          }, { status: 404 });
        default:
          return NextResponse.json({
            error: 'DATABASE_ERROR',
            message: 'A database error occurred while updating the inventory item',
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

// DELETE /api/inventory/[id] - Delete a specific inventory item
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
    console.log(`🔄 Deleting inventory item with ID: ${id}`);

    if (!id) {
      return NextResponse.json({
        error: 'MISSING_ID',
        message: 'Inventory item ID is required'
      }, { status: 400 });
    }

    // Check if item exists and has any usages
    const existingItem = await prisma.inventory.findUnique({
      where: { id },
      select: { 
        id: true, 
        name: true,
        _count: {
          select: {
            usages: true
          }
        }
      }
    });

    if (!existingItem) {
      return NextResponse.json({
        error: 'ITEM_NOT_FOUND',
        message: 'Inventory item not found'
      }, { status: 404 });
    }

    // Check if item has usage records
    if (existingItem._count.usages > 0) {
      return NextResponse.json({
        error: 'ITEM_IN_USE',
        message: `Cannot delete item. It is linked to ${existingItem._count.usages} mission usage record(s).`
      }, { status: 409 });
    }

    // Delete the item
    await prisma.inventory.delete({ 
      where: { id } 
    });

    console.log(`✅ Inventory item deleted successfully: ${existingItem.name}`);
    
    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('❌ Failed to delete inventory item:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2025':
          return NextResponse.json({
            error: 'ITEM_NOT_FOUND',
            message: 'Inventory item not found for deletion'
          }, { status: 404 });
        case 'P2003':
          return NextResponse.json({
            error: 'ITEM_IN_USE',
            message: 'Cannot delete item as it is referenced by other records'
          }, { status: 409 });
        default:
          return NextResponse.json({
            error: 'DATABASE_ERROR',
            message: 'A database error occurred while deleting the inventory item',
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