//app/api/inventory/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// GET /api/inventory/[id] - Fetch a single inventory item
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const item = await prisma.inventory.findUnique({
      where: { id },
    });

    if (!item) {
      return new NextResponse('Inventory item not found', { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to fetch inventory item:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PATCH /api/inventory/[id] - Update an inventory item
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const body = await request.json();
    const { name, category, unit, currentStock, minimumStock, unitPrice, supplier } = body;

    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        name,
        category,
        unit,
        currentStock: new Decimal(currentStock),
        minimumStock: new Decimal(minimumStock),
        unitPrice: new Decimal(unitPrice),
        supplier,
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Failed to update inventory item:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// DELETE /api/inventory/[id] - Delete an inventory item
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;

    // Check for usages before deleting
    const usages = await prisma.inventoryUsage.count({
        where: { inventoryId: id }
    });

    if (usages > 0) {
        return new NextResponse(
            `Cannot delete item. It is linked to ${usages} mission usage record(s).`,
            { status: 409 } // 409 Conflict
        );
    }

    await prisma.inventory.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}