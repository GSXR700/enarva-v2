// app/api/inventory-usage/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const inventoryUsages = await prisma.inventoryUsage.findMany({
      include: {
        inventory: true,
        mission: {
          include: {
            lead: true
          }
        }
      },
      orderBy: {
        usedAt: 'desc'
      }
    })
    
    return NextResponse.json(inventoryUsages)
  } catch (error) {
    console.error('Failed to fetch inventory usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { inventoryId, missionId, quantity, notes } = body

    if (!inventoryId || !missionId || !quantity) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Check if inventory has sufficient stock
    const inventory = await prisma.inventory.findUnique({
      where: { id: inventoryId }
    })

    if (!inventory) {
      return new NextResponse('Inventory item not found', { status: 404 })
    }

    const quantityDecimal = new Decimal(quantity)
    if (inventory.currentStock.lessThan(quantityDecimal)) {
      return new NextResponse('Insufficient stock', { status: 400 })
    }

    // Create usage record and update inventory in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create usage record
      const usage = await tx.inventoryUsage.create({
        data: {
          inventoryId,
          missionId,
          quantity: quantityDecimal,
          notes: notes || null
        },
        include: {
          inventory: true,
          mission: {
            include: {
              lead: true
            }
          }
        }
      })

      // Update inventory stock
      await tx.inventory.update({
        where: { id: inventoryId },
        data: {
          currentStock: {
            decrement: quantityDecimal
          }
        }
      })

      return usage
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Failed to create inventory usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}