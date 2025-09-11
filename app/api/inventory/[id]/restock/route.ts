// app/api/inventory/[id]/restock/route.ts - INDIVIDUAL ITEM RESTOCK
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { id } = await params
    const { quantity, note } = await request.json()

    if (!quantity || quantity <= 0) {
      return new NextResponse('Valid quantity required', { status: 400 })
    }

    // Check if item exists
    const item = await prisma.inventory.findUnique({
      where: { id }
    })

    if (!item) {
      return new NextResponse('Item not found', { status: 404 })
    }

    // Update stock
    const updatedItem = await prisma.inventory.update({
      where: { id },
      data: {
        currentStock: {
          increment: quantity
        },
        updatedAt: new Date()
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'SYSTEM_MAINTENANCE',
        title: 'Réapprovisionnement',
        description: `${item.name}: +${quantity} ${item.unit}${note ? ` - ${note}` : ''}`,
        userId: session.user.id,
        metadata: {
          itemId: id,
          restockQuantity: quantity,
          previousStock: item.currentStock,
          newStock: updatedItem.currentStock,
          note
        }
      }
    })

    return NextResponse.json({
      success: true,
      item: updatedItem,
      message: `${item.name} réapprovisionné: +${quantity} ${item.unit}`
    })

  } catch (error) {
    console.error('Failed to restock item:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}