// app/api/inventory/[id]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.inventory.findUnique({ 
        where: { id },
        include: {
            usages: {
                include: {
                    mission: {
                        include: {
                            lead: true
                        }
                    }
                }
            }
        }
    });
    if (!item) return new NextResponse('Inventory item not found', { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to fetch inventory item:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentStock, minimumStock, unitPrice, ...rest } = body;
    
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        ...rest,
        currentStock: new Decimal(currentStock),
        minimumStock: new Decimal(minimumStock),
        unitPrice: new Decimal(unitPrice),
      },
    });
    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Failed to update inventory item:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const usages = await prisma.inventoryUsage.count({ where: { inventoryId: id } });
    if (usages > 0) {
        return new NextResponse(`Cannot delete item. It is linked to ${usages} mission usage record(s).`, { status: 409 });
    }
    await prisma.inventory.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete inventory item:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}