// app/api/inventory/export/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const inventory = await prisma.inventory.findMany({
      include: {
        usages: {
          include: {
            mission: {
              include: {
                lead: true
              }
            }
          },
          orderBy: {
            usedAt: 'desc'
          },
          take: 1
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Generate CSV content
    const headers = [
      'Nom',
      'Catégorie',
      'Stock Actuel',
      'Stock Minimum',
      'Unité',
      'Prix Unitaire',
      'Valeur Totale',
      'Fournisseur',
      'Statut',
      'Dernière Utilisation',
      'Date Création',
      'Date Mise à Jour'
    ]

    const csvRows = [
      headers.join(','),
      ...inventory.map(item => {
        const status = getStockStatus(Number(item.currentStock), Number(item.minimumStock))
        const totalValue = Number(item.currentStock) * Number(item.unitPrice) // Fix: Convert Decimal to number
        const lastUsage = item.usages[0]?.usedAt 
          ? new Date(item.usages[0].usedAt).toLocaleDateString()
          : 'Jamais'

        return [
          `"${item.name}"`,
          `"${item.category}"`,
          Number(item.currentStock).toString(), // Fix: Convert Decimal to number
          Number(item.minimumStock).toString(), // Fix: Convert Decimal to number
          `"${item.unit}"`,
          Number(item.unitPrice).toString(), // Fix: Convert Decimal to number
          totalValue.toString(),
          `"${item.supplier}"`,
          `"${getStatusText(status)}"`,
          `"${lastUsage}"`,
          new Date(item.createdAt).toLocaleDateString(),
          new Date(item.updatedAt).toLocaleDateString()
        ].join(',')
      })
    ]

    const csvContent = csvRows.join('\n')

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventaire_${new Date().toISOString().split('T')[0]}.csv"`
      }
    })

  } catch (error) {
    console.error('Failed to export inventory:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

function getStockStatus(currentStock: number, minimumStock: number): string {
  if (currentStock === 0) return 'OUT_OF_STOCK'
  if (currentStock <= minimumStock) return 'LOW_STOCK'
  return 'IN_STOCK'
}

function getStatusText(status: string): string {
  switch (status) {
    case 'IN_STOCK': return 'En stock'
    case 'LOW_STOCK': return 'Stock faible'
    case 'OUT_OF_STOCK': return 'Rupture'
    default: return 'Inconnu'
  }
}