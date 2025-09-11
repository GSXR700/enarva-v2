// app/api/inventory/bulk-restock/route.ts - BULK INVENTORY RESTOCK

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = session.user as any
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { items } = await request.json()

    if (!Array.isArray(items) || items.length === 0) {
      return new NextResponse('Items array required', { status: 400 })
    }

    const results = []

    for (const item of items) {
      try {
        const { id, restockQuantity } = item

        if (!id || !restockQuantity || restockQuantity <= 0) {
          results.push({
            id,
            status: 'error',
            message: 'Invalid restock data'
          })
          continue
        }

        // Update inventory stock
        const updatedItem = await prisma.inventory.update({
          where: { id },
          data: {
            currentStock: {
              increment: restockQuantity
            },
            updatedAt: new Date()
          }
        })

        // Create activity log
        await prisma.activity.create({
          data: {
            type: 'SYSTEM_MAINTENANCE',
            title: 'Réapprovisionnement automatique',
            description: `${updatedItem.name}: +${restockQuantity} ${updatedItem.unit}`,
            userId: user.id,
            metadata: {
              itemId: id,
              restockQuantity,
              newStock: updatedItem.currentStock,
              bulkRestock: true
            }
          }
        })

        results.push({
          id,
          status: 'success',
          message: `Réapprovisionné: +${restockQuantity}`,
          newStock: updatedItem.currentStock
        })

      } catch (error) {
        console.error(`Failed to restock item ${item.id}:`, error)
        results.push({
          id: item.id,
          status: 'error',
          message: 'Erreur lors du réapprovisionnement'
        })
      }
    }

    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      processed: items.length,
      successCount,
      errorCount,
      results
    })

  } catch (error) {
    console.error('Bulk restock failed:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}