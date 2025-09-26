// app/api/inventory/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// GET /api/inventory - Fetch all inventory items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    console.log('🔄 Fetching all inventory items...');

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lowStock = searchParams.get('lowStock');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause for filtering
    const where: Prisma.InventoryWhereInput = {};

    // Category filter
    if (category && category !== 'ALL') {
      where.category = category as any;
    }

    // Search filter
    if (search && search.trim() !== '') {
      const searchTerm = search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { supplier: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Base query
    let baseQuery = {
      where,
      orderBy: {
        name: 'asc' as const,
      },
      take: limit,
      skip: offset,
    };

    // Get inventory items
    const inventoryItems = await prisma.inventory.findMany(baseQuery);

    // Filter low stock items if requested
    let filteredItems = inventoryItems;
    if (lowStock === 'true') {
      filteredItems = inventoryItems.filter(item => 
        Number(item.currentStock) <= Number(item.minimumStock)
      );
    }

    // Get total count for pagination
    const totalCount = await prisma.inventory.count({ where });

    console.log(`✅ Fetched ${filteredItems.length} inventory items`);
    
    return NextResponse.json({
      items: filteredItems,
      totalCount,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(totalCount / limit),
      limit,
      hasNextPage: offset + limit < totalCount,
      hasPreviousPage: offset > 0,
      lowStockCount: inventoryItems.filter(item => 
        Number(item.currentStock) <= Number(item.minimumStock)
      ).length
    });

  } catch (error) {
    console.error('❌ Failed to fetch inventory:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json({
        error: 'DATABASE_ERROR',
        message: 'Database error occurred while fetching inventory',
        code: error.code
      }, { status: 500 });
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/inventory - Create a new inventory item
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('🔄 Creating new inventory item:', body);

    // Extract and validate required fields
    const {
      name,
      category,
      unit,
      currentStock,
      minimumStock,
      unitPrice,
      supplier
    } = body;

    // Basic validation
    if (!name || !category || !unit || currentStock === undefined || minimumStock === undefined || unitPrice === undefined) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields',
        requiredFields: ['name', 'category', 'unit', 'currentStock', 'minimumStock', 'unitPrice']
      }, { status: 400 });
    }

    // Validate name
    if (name.trim() === '') {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Item name cannot be empty'
      }, { status: 400 });
    }

    // Validate category
    const validCategories = ['CLEANING_PRODUCTS', 'EQUIPMENT', 'CONSUMABLES', 'PROTECTIVE_GEAR'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Invalid category',
        validCategories
      }, { status: 400 });
    }

    // Validate unit
    if (unit.trim() === '') {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Unit cannot be empty'
      }, { status: 400 });
    }

    // Validate numeric fields
    const numericCurrentStock = parseFloat(currentStock);
    const numericMinimumStock = parseFloat(minimumStock);
    const numericUnitPrice = parseFloat(unitPrice);

    if (isNaN(numericCurrentStock) || numericCurrentStock < 0) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Current stock must be a non-negative number'
      }, { status: 400 });
    }

    if (isNaN(numericMinimumStock) || numericMinimumStock < 0) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Minimum stock must be a non-negative number'
      }, { status: 400 });
    }

    if (isNaN(numericUnitPrice) || numericUnitPrice < 0) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Unit price must be a non-negative number'
      }, { status: 400 });
    }

    // Check if item with same name already exists
    const existingItem = await prisma.inventory.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        }
      }
    });

    if (existingItem) {
      return NextResponse.json({
        error: 'DUPLICATE_ITEM',
        message: 'An item with this name already exists'
      }, { status: 409 });
    }

    // Prepare data for creation
    const inventoryData = {
      name: name.trim(),
      category,
      unit: unit.trim(),
      currentStock: new Decimal(numericCurrentStock),
      minimumStock: new Decimal(numericMinimumStock),
      unitPrice: new Decimal(numericUnitPrice),
      supplier: supplier && supplier.trim() !== '' ? supplier.trim() : null,
    };

    console.log('🔧 Creating inventory item with data:', {
      ...inventoryData,
      currentStock: inventoryData.currentStock.toString(),
      minimumStock: inventoryData.minimumStock.toString(),
      unitPrice: inventoryData.unitPrice.toString()
    });

    // Create the inventory item
    const newItem = await prisma.inventory.create({
      data: inventoryData
    });

    console.log(`✅ Inventory item created successfully: ${newItem.name} (ID: ${newItem.id})`);
    
    return NextResponse.json({
      success: true,
      message: 'Inventory item created successfully',
      item: newItem
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Failed to create inventory item:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return NextResponse.json({
            error: 'DUPLICATE_ITEM',
            message: 'An item with this information already exists'
          }, { status: 409 });
        default:
          return NextResponse.json({
            error: 'DATABASE_ERROR',
            message: 'A database error occurred while creating the inventory item',
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
