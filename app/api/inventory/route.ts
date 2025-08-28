// app/api/inventory/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient()

// GET /api/inventory - Fetch all inventory items
export async function GET() {
  try {
    const inventoryItems = await prisma.inventory.findMany({
      orderBy: {
        name: 'asc',
      },
    })
    return NextResponse.json(inventoryItems)
  } catch (error) {
    console.error('Failed to fetch inventory:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/inventory - Create a new inventory item
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, category, unit, currentStock, minimumStock, unitPrice, supplier } = body;

        if (!name || !category || !unit || !currentStock || !minimumStock || !unitPrice) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const newItem = await prisma.inventory.create({
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

        return NextResponse.json(newItem, { status: 201 });

    } catch (error) {
        console.error('Failed to create inventory item:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}