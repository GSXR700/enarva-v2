//app/api/quotes/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient, QuoteType, LeadStatus, ActivityType } from '@prisma/client'
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
    // Get user session for activity tracking
    const session = await getServerSession(authOptions)
    const currentUserId = session?.user?.id

    const body = await request.json()
    console.log('Received quote data:', body)

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
    } = body;

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
      let targetLeadId = leadId;

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