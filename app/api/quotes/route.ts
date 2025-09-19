//app/api/quotes/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient, QuoteType, LeadStatus, ActivityType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

const prisma = new PrismaClient()
// Schema de validation pour la création d'un devis

const createQuoteSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required').optional(),
  newClientName: z.string().min(1, 'Client name is required').optional(),
  quoteNumber: z.string().min(1, 'Quote number is required'),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.1, 'Quantity must be positive'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
    totalPrice: z.number().min(0, 'Total price must be positive')
  })).min(1, 'At least one line item required'),
  
  // FIX 1: Convert numbers to Decimal for Prisma
  subTotalHT: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  vatAmount: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  totalTTC: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  finalPrice: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),

  // FIX 2: Coerce string to Date and make it optional
  expiresAt: z.coerce.date().optional(),

  // FIX 3: Make quote type optional to match schema
  type: z.enum(['EXPRESS', 'STANDARD', 'PREMIUM']).optional(),
  
  businessType: z.enum(['SERVICE', 'PRODUCT']).default('SERVICE')
});

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
    // Get user session for activity tracking
    const session = await getServerSession(authOptions)
    const currentUserId = session?.user?.id

    const body = await request.json()
    console.log('Received quote data:', body)

    let validatedData;
    try {
      validatedData = createQuoteSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Validation failed', details: validationError.flatten().fieldErrors }, 
          { status: 400 }
        );
      }
      throw validationError;
    }

    const { 
      leadId, 
      newClientName, 
      quoteNumber, 
      lineItems, 
      subTotalHT, 
      vatAmount, 
      totalTTC, 
      finalPrice, 
      expiresAt, 
      type,
      businessType,
      ...restData 
    } = validatedData;

    // Validation des champs requis
    if (!quoteNumber || !lineItems || finalPrice === undefined || finalPrice === null) {
      console.error('Missing required fields:', { 
        quoteNumber: !!quoteNumber, 
        lineItems: !!lineItems, 
        finalPrice: finalPrice !== undefined && finalPrice !== null 
      })
      return NextResponse.json({ 
        error: 'Missing required fields', 
        message: 'quoteNumber, lineItems, and finalPrice are required' 
      }, { status: 400 })
    }

    // Vérifier qu'on a soit un leadId soit un newClientName
    if (!leadId && (!newClientName || !newClientName.trim())) {
      console.error('Either leadId or newClientName is required')
      return NextResponse.json({ 
        error: 'Client required', 
        message: 'Either leadId or newClientName is required' 
      }, { status: 400 })
    }

    // Execute the quote creation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let targetLeadId: string = leadId || '';

      // Si pas de leadId mais un newClientName, créer un nouveau lead
      if (!leadId && newClientName && newClientName.trim()) {
        console.log('Creating new lead for:', newClientName.trim())
        
        // Extraire prénom et nom du nom complet
        const nameParts = newClientName.trim().split(' ');
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || 'Nouveau';

        const newLead = await tx.lead.create({
          data: {
            firstName,
            lastName,
            phone: 'À renseigner', // Valeur par défaut car le champ est requis
            email: null,
            address: null,
            status: LeadStatus.QUOTE_SENT, // Statut approprié pour un devis envoyé
            leadType: 'PARTICULIER',
            channel: 'FORMULAIRE_SITE', // Canal par défaut
            originalMessage: `Lead créé automatiquement lors de la création du devis ${quoteNumber}`,
            score: 0,
          }
        });

        targetLeadId = newLead.id;
        console.log('Created new lead with ID:', targetLeadId)
      }

      // Ensure we have a valid leadId
      if (!targetLeadId) {
        throw new Error('Lead ID is required');
      }

      // Vérifier que le lead existe
      const existingLead = await tx.lead.findUnique({
        where: { id: targetLeadId },
        select: { id: true, status: true, firstName: true, lastName: true }
      });

      if (!existingLead) {
        throw new Error(`Lead with ID ${targetLeadId} not found`);
      }

      console.log('Creating quote for lead:', targetLeadId)

      // Créer le devis
      const newQuote = await tx.quote.create({
        data: {
          ...restData,
          leadId: targetLeadId,
          quoteNumber,
          businessType: businessType || 'SERVICE',
          lineItems,
          subTotalHT: subTotalHT ? new Decimal(subTotalHT) : new Decimal(0),
          vatAmount: vatAmount ? new Decimal(vatAmount) : new Decimal(0),
          totalTTC: totalTTC ? new Decimal(totalTTC) : new Decimal(finalPrice),
          finalPrice: new Decimal(finalPrice),
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 jours par défaut
          type: type || QuoteType.STANDARD,
          status: 'DRAFT',
        },
        include: {
          lead: true
        }
      });

      // Mettre à jour le statut du lead si ce n'est pas déjà fait
      if (existingLead.status !== LeadStatus.QUOTE_SENT) {
        await tx.lead.update({
          where: { id: targetLeadId },
          data: { 
            status: LeadStatus.QUOTE_SENT,
            updatedAt: new Date()
          }
        });
        console.log('Updated lead status to QUOTE_SENT')
      }

      // Créer une activité pour traquer la création du devis
      // Only create activity if we have a valid user ID
      if (currentUserId) {
        try {
          await tx.activity.create({
            data: {
              type: ActivityType.QUOTE_GENERATED,
              title: `Devis ${quoteNumber} créé`,
              description: `Devis ${quoteNumber} créé${newClientName ? ` pour le nouveau client ${newClientName}` : ` pour ${existingLead.firstName} ${existingLead.lastName}`}`,
              userId: currentUserId,
              leadId: targetLeadId,
            }
          });
          console.log('Activity created for quote generation')
        } catch (activityError) {
          // Log the error but don't fail the whole transaction
          console.warn('Failed to create activity:', activityError)
        }
      } else {
        console.log('No user session found, skipping activity creation')
      }

      console.log('Quote created successfully:', newQuote.id)
      return newQuote;
    });

    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Failed to create quote:', error)
    
    // Return a more specific error
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: 'Failed to create quote', 
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while creating the quote'
    }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}