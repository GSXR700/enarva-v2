// app/api/quotes/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { calculateQuotePrice } from '@/lib/utils'
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

// POST /api/quotes - Crée un nouveau devis
export async function POST(request: Request) {
  try {
    const body = await request.json()
    // --- CORRECTION CLÉ ---
    // On destructure `leadName` pour l'exclure du reste des données (`quoteDetails`)
    // qui seront envoyées à Prisma.
    const { leadId, quoteNumber, leadName, ...quoteDetails } = body

    if (!leadId || !quoteNumber || !quoteDetails.surface) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Le calcul du prix reste le même
    const pricing = calculateQuotePrice(quoteDetails)

    const newQuote = await prisma.quote.create({
      data: {
        ...quoteDetails,
        leadId,
        quoteNumber,
        basePrice: new Decimal(pricing.basePrice),
        finalPrice: new Decimal(pricing.finalPrice),
        coefficients: pricing.coefficients,
        expiresAt: new Date(new Date().setDate(new Date().getDate() + 30)), // Expire dans 30 jours
      },
    })
    return NextResponse.json(newQuote, { status: 201 })
  } catch (error) {
    console.error('Failed to create quote:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}