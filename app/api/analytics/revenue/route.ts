// app/api/analytics/revenue/route.ts - REVENUE ANALYTICS
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'month' // week, month, quarter, year
    const year = parseInt(url.searchParams.get('year') || new Date().getFullYear().toString())

    let groupBy: string
    let periods: any[]

    switch (period) {
      case 'week':
        // Last 12 weeks
        groupBy = 'week'
        periods = Array.from({ length: 12 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (i * 7))
          return {
            period: date.toISOString().split('T')[0],
            label: `Semaine ${52 - i}`
          }
        }).reverse()
        break
        
      case 'quarter':
        // 4 quarters of the year
        groupBy = 'quarter'
        periods = [
          { period: `${year}-Q1`, label: 'T1' },
          { period: `${year}-Q2`, label: 'T2' },
          { period: `${year}-Q3`, label: 'T3' },
          { period: `${year}-Q4`, label: 'T4' }
        ]
        break
        
      case 'year':
        // Last 5 years
        groupBy = 'year'
        periods = Array.from({ length: 5 }, (_, i) => ({
          period: (year - 4 + i).toString(),
          label: (year - 4 + i).toString()
        }))
        break
        
      default: // month
        groupBy = 'month'
        periods = Array.from({ length: 12 }, (_, i) => ({
          period: `${year}-${String(i + 1).padStart(2, '0')}`,
          label: new Date(year, i, 1).toLocaleDateString('fr-FR', { month: 'short' })
        }))
    }

    // Get revenue data grouped by period
    const revenueData = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${groupBy}, "createdAt") as period,
        SUM("amount") as revenue,
        COUNT(*) as invoice_count
      FROM "Invoice"
      WHERE "status" = 'PAID'
        AND EXTRACT(YEAR FROM "createdAt") = ${year}
      GROUP BY DATE_TRUNC(${groupBy}, "createdAt")
      ORDER BY period
    `

    // Format response
    const formattedData = periods.map(p => {
      const data = (revenueData as any[]).find(r => 
        r.period.toISOString().startsWith(p.period.split('-')[0])
      )
      
      return {
        period: p.period,
        label: p.label,
        revenue: Number(data?.revenue || 0),
        invoiceCount: Number(data?.invoice_count || 0)
      }
    })

    const totalRevenue = formattedData.reduce((sum, item) => sum + item.revenue, 0)
    const totalInvoices = formattedData.reduce((sum, item) => sum + item.invoiceCount, 0)

    return NextResponse.json({
      period,
      year,
      data: formattedData,
      summary: {
        totalRevenue,
        totalInvoices,
        averageInvoiceValue: totalInvoices > 0 ? totalRevenue / totalInvoices : 0
      }
    })

  } catch (error) {
    console.error('Failed to fetch revenue analytics:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}