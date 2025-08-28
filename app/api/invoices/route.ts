// app/api/invoices/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient()

// GET /api/invoices - Fetch all invoices with related mission and lead details
export async function GET() {
  try {
    const invoices = await prisma.mission.findMany({
        // For simplicity, we can consider every completed mission as a potential invoice
        where: { status: 'COMPLETED' }, 
        include: {
            lead: true,
            quote: true,
        },
        orderBy: {
            scheduledDate: 'desc'
        }
    });
    return NextResponse.json(invoices)
  } catch (error) {
    console.error('Failed to fetch invoices:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}