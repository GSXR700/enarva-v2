// app/api/dashboard/stats/route.ts - FIXED VERSION
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

    // Get date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    // Parallel queries for better performance
    const [
      totalLeads,
      newLeadsThisMonth,
      activeMissions,
      completedMissionsThisMonth,
      totalRevenue,
      revenueThisMonth,
      activeSubscriptions,
      lowStockItems,
      pendingQuotes,
      overdueInvoices
    ] = await Promise.all([
      // Total leads
      prisma.lead.count(),
      
      // New leads this month
      prisma.lead.count({
        where: {
          createdAt: { gte: startOfMonth }
        }
      }),
      
      // Active missions
      prisma.mission.count({
        where: {
          status: { in: ['SCHEDULED', 'IN_PROGRESS', 'QUALITY_CHECK'] }
        }
      }),
      
      // Completed missions this month
      prisma.mission.count({
        where: {
          status: 'COMPLETED',
          updatedAt: { gte: startOfMonth }
        }
      }),
      
      // Total revenue (from paid invoices)
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['PAID'] }
        }
      }),
      
      // Revenue this month
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['PAID'] },
          updatedAt: { gte: startOfMonth }
        }
      }),
      
      // Active subscriptions
      prisma.subscription.count({
        where: {
          status: 'ACTIVE'
        }
      }),
      
      // Low stock items - Fix: Use raw query to avoid type issues
      prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM inventory
        WHERE "currentStock" <= "minimumStock"
      `,
      
      // Pending quotes - Fix: Remove CANCELLED from status filter
      prisma.quote.count({
        where: {
          status: { in: ['DRAFT', 'SENT'] }
        }
      }),
      
      // Overdue invoices
      prisma.invoice.count({
        where: {
          status: { in: ['SENT'] },
          dueDate: { lt: now }
        }
      })
    ])

    // Calculate conversion rate
    const qualifiedLeads = await prisma.lead.count({
      where: {
        status: { in: ['QUALIFIED', 'QUOTE_SENT', 'QUOTE_ACCEPTED'] }
      }
    })
    
    const conversionRate = totalLeads > 0 
      ? ((qualifiedLeads / totalLeads) * 100).toFixed(1)
      : '0.0'

    // Get growth metrics
    const previousMonthStart = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() - 1, 1)
    const previousMonthEnd = new Date(startOfMonth.getTime() - 1)
    
    const [
      previousMonthLeads,
      previousMonthRevenue
    ] = await Promise.all([
      prisma.lead.count({
        where: {
          createdAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        }
      }),
      
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['PAID'] },
          updatedAt: {
            gte: previousMonthStart,
            lte: previousMonthEnd
          }
        }
      })
    ])

    // Calculate growth percentages - Fix: Handle Decimal types properly
    const leadsGrowth = previousMonthLeads > 0
      ? (((newLeadsThisMonth - previousMonthLeads) / previousMonthLeads) * 100).toFixed(1)
      : '0.0'

    const previousMonthRevenueNum = Number(previousMonthRevenue._sum?.amount || 0)
    const revenueGrowth = previousMonthRevenueNum > 0
      ? (((Number(revenueThisMonth._sum?.amount || 0) - previousMonthRevenueNum) / previousMonthRevenueNum) * 100).toFixed(1)
      : '0.0'

    const stats = {
      // Core metrics
      totalLeads,
      newLeadsThisMonth,
      activeMissions,
      completedMissionsThisMonth,
      totalRevenue: Number(totalRevenue._sum?.amount || 0),
      revenueThisMonth: Number(revenueThisMonth._sum?.amount || 0),
      conversionRate: `${conversionRate}%`,
      
      // Subscription & inventory
      activeSubscriptions,
      lowStockItems: Number((lowStockItems as any)[0]?.count || 0),
      
      // Pending items
      pendingQuotes,
      overdueInvoices,
      
      // Growth metrics
      leadsGrowth: `${leadsGrowth}%`,
      revenueGrowth: `${revenueGrowth}%`,
      
      // Additional metrics
      averageQuoteValue: await getAverageQuoteValue(),
      topPerformingAgent: await getTopPerformingAgent(startOfMonth),
      upcomingMissions: await getUpcomingMissionsCount()
    }

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

async function getAverageQuoteValue(): Promise<number> {
  const result = await prisma.quote.aggregate({
    _avg: { finalPrice: true },
    where: {
      status: { not: 'EXPIRED' } // Fix: Use valid enum value
    }
  })
  return Number(result._avg?.finalPrice || 0)
}

async function getTopPerformingAgent(startOfMonth: Date): Promise<string | null> {
  const agents = await prisma.lead.groupBy({
    by: ['assignedToId'],
    where: {
      assignedToId: { not: null },
      createdAt: { gte: startOfMonth },
      status: { in: ['QUALIFIED', 'QUOTE_ACCEPTED', 'COMPLETED'] }
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 1
  })

  if (agents.length === 0) return null

  const topAgent = await prisma.user.findUnique({
    where: { id: agents[0].assignedToId! },
    select: { name: true }
  })

  return topAgent?.name || null
}

async function getUpcomingMissionsCount(): Promise<number> {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999)

  return await prisma.mission.count({
    where: {
      status: 'SCHEDULED',
      scheduledDate: { lte: tomorrow }
    }
  })
}