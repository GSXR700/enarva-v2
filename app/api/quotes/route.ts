//app/api/quotes/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient, QuoteType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

// GET /api/quotes - Récupère tous les devis
export async function GET() {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
      include: { lead: true },
    })
    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Failed to fetch quotes:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/quotes - Crée un nouveau devis détaillé
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { leadId, quoteNumber, lineItems, subTotalHT, vatAmount, totalTTC, finalPrice, expiresAt, type, ...restData } = body;

    if (!leadId || !quoteNumber || !lineItems) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const newQuote = await prisma.quote.create({
      data: {
        ...restData,
        leadId,
        quoteNumber,
        lineItems,
        subTotalHT: new Decimal(subTotalHT),
        vatAmount: new Decimal(vatAmount),
        totalTTC: new Decimal(totalTTC),
        finalPrice: new Decimal(finalPrice),
        expiresAt: expiresAt ? new Date(expiresAt) : new Date(new Date().setDate(new Date().getDate() + 30)),
        type: type || QuoteType.STANDARD,
        status: 'DRAFT',
      },
    });
    return NextResponse.json(newQuote, { status: 201 })
  } catch (error) {
    console.error('Failed to create quote:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}