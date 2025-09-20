//app/api/quotes/route.ts - FIXED VERSION FOR NEW CLIENT CREATION
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient, QuoteType, LeadStatus, ActivityType, PropertyType, ProductQuoteCategory, DeliveryType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

const prisma = new PrismaClient()

// FIXED: Enhanced validation schema for quote creation
const createQuoteSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required').optional(),
  newClientName: z.string().min(1, 'Client name is required').optional(),
  newClientEmail: z.string().email('Valid email required').optional().nullable(),
  newClientPhone: z.string().min(8, 'Valid phone number required').optional(), // FIXED: Reduced from 10 to 8
  newClientAddress: z.string().optional().nullable(),
  quoteNumber: z.string().min(1, 'Quote number is required'),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.1, 'Quantity must be positive'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
    totalPrice: z.number().min(0, 'Total price must be positive')
  })).min(1, 'At least one line item required'),
  
  // Convert numbers to Decimal for Prisma
  subTotalHT: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  vatAmount: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  totalTTC: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  finalPrice: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),

  // Optional date with proper handling
  expiresAt: z.coerce.date().optional(),

  // Optional quote type
  type: z.enum(['EXPRESS', 'STANDARD', 'PREMIUM']).optional(),
  
  businessType: z.enum(['SERVICE', 'PRODUCT']).default('SERVICE'),
  
  // Additional optional fields with proper enum validation
  surface: z.number().optional().nullable(),
  levels: z.number().default(1).optional(),
  
  // Property type with correct enum values
  propertyType: z.enum([
    'APARTMENT_SMALL', 'APARTMENT_MEDIUM', 'APARTMENT_MULTI', 'APARTMENT_LARGE',
    'VILLA_SMALL', 'VILLA_MEDIUM', 'VILLA_LARGE', 'PENTHOUSE',
    'COMMERCIAL', 'STORE', 'HOTEL_STANDARD', 'HOTEL_LUXURY', 'OFFICE',
    'RESIDENCE_B2B', 'BUILDING', 'RESTAURANT', 'WAREHOUSE', 'OTHER'
  ]).optional(),
  
  // Product-specific fields
  productCategory: z.enum(['EQUIPEMENT', 'PRODUIT_CHIMIQUE', 'ACCESSOIRE', 'CONSOMMABLE', 'OTHER']).optional(),
  productDetails: z.any().optional(),
  deliveryType: z.enum(['PICKUP', 'STANDARD_DELIVERY', 'EXPRESS_DELIVERY', 'SCHEDULED_DELIVERY', 'WHITE_GLOVE']).optional(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
  
}).refine((data) => {
  // CRITICAL: Either leadId or newClientName+newClientPhone must be provided
  const hasExistingLead = data.leadId && data.leadId.length > 0;
  const hasNewClientData = data.newClientName && data.newClientName.trim().length > 0 && 
                           data.newClientPhone && data.newClientPhone.trim().length > 0;
  
  return hasExistingLead || hasNewClientData;
}, {
  message: "Either an existing lead ID or complete new client information (name + phone) must be provided",
  path: ["leadId"]
});

// GET /api/quotes - Récupère tous les devis avec pagination et filtres
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const quotes = await prisma.quote.findMany({
      skip,
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            leadType: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Convert Decimal fields to numbers for JSON serialization
    const serializedQuotes = quotes.map(quote => ({
      ...quote,
      subTotalHT: quote.subTotalHT.toNumber(),
      vatAmount: quote.vatAmount.toNumber(),
      totalTTC: quote.totalTTC.toNumber(),
      finalPrice: quote.finalPrice.toNumber(),
    }))

    return NextResponse.json(serializedQuotes)
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

    console.log('🚀 Starting quote creation process...')
    const body = await request.json()
    console.log('📥 Received quote data:', body)

    // CRITICAL: Validate the incoming data
    let validatedData;
    try {
      validatedData = createQuoteSchema.parse(body);
      console.log('✅ Data validation successful')
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('❌ Validation failed:', validationError.flatten().fieldErrors)
        return NextResponse.json(
          { 
            error: 'Validation failed', 
            details: validationError.flatten().fieldErrors,
            message: 'Please check the required fields and try again'
          }, 
          { status: 400 }
        );
      }
      throw validationError;
    }

    const { 
      leadId, 
      newClientName,
      newClientEmail,
      newClientPhone,
      newClientAddress,
      quoteNumber, 
      lineItems, 
      subTotalHT, 
      vatAmount, 
      totalTTC, 
      finalPrice, 
      expiresAt, 
      type,
      businessType,
      surface,
      levels,
      propertyType,
      productCategory,
      productDetails,
      deliveryType,
      deliveryAddress,
      deliveryNotes,
      ...restData 
    } = validatedData;

    // Execute the quote creation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let targetLeadId: string = leadId || '';

      // FIXED: Create new lead if no leadId provided but newClientName exists
      if (!leadId && newClientName && newClientName.trim() && newClientPhone && newClientPhone.trim()) {
        console.log('👤 Creating new lead for:', newClientName.trim())
        
        // Extract first and last name from full name
        const nameParts = newClientName.trim().split(' ');
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || 'Nouveau';

        // CRITICAL: Ensure phone number is valid
        const cleanPhone = newClientPhone.trim();
        if (cleanPhone.length < 8) {
          throw new Error('Le numéro de téléphone doit contenir au moins 8 caractères');
        }

        // Create new lead with provided information
        const newLead = await tx.lead.create({
          data: {
            firstName,
            lastName,
            phone: cleanPhone, // FIXED: Use actual phone number, not placeholder
            email: newClientEmail && newClientEmail.trim() ? newClientEmail.trim() : null,
            address: newClientAddress && newClientAddress.trim() ? newClientAddress.trim() : null,
            status: LeadStatus.NEW, // FIXED: Start with NEW, will be updated to QUOTE_SENT later
            leadType: 'PARTICULIER',
            channel: 'FORMULAIRE_SITE',
            originalMessage: `Lead créé automatiquement lors de la création du devis ${quoteNumber}`,
            score: 50, // Default score for new leads from quote creation
            propertyType: propertyType as PropertyType || null,
          }
        });

        targetLeadId = newLead.id;
        console.log('✅ Created new lead with ID:', targetLeadId)
      }

      // Ensure we have a valid leadId
      if (!targetLeadId) {
        throw new Error('Lead ID is required - either provide existing leadId or complete new client information');
      }

      // Verify the lead exists and get current status
      const existingLead = await tx.lead.findUnique({
        where: { id: targetLeadId },
        select: { 
          id: true, 
          status: true, 
          firstName: true, 
          lastName: true,
          phone: true,
          email: true
        }
      });

      if (!existingLead) {
        throw new Error(`Lead with ID ${targetLeadId} not found`);
      }

      console.log('📋 Creating quote for lead:', existingLead.firstName, existingLead.lastName)

      // Create the quote
      const newQuote = await tx.quote.create({
        data: {
          leadId: targetLeadId,
          quoteNumber,
          businessType: businessType || 'SERVICE',
          lineItems,
          subTotalHT: subTotalHT ? new Decimal(subTotalHT) : new Decimal(0),
          vatAmount: vatAmount ? new Decimal(vatAmount) : new Decimal(0),
          totalTTC: totalTTC ? new Decimal(totalTTC) : new Decimal(finalPrice),
          finalPrice: new Decimal(finalPrice),
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          type: type as QuoteType || QuoteType.STANDARD,
          status: 'DRAFT',
          surface: surface || null,
          levels: levels || 1,
          propertyType: propertyType as PropertyType || null,
          productCategory: productCategory as ProductQuoteCategory || null,
          productDetails: productDetails || null,
          deliveryType: deliveryType as DeliveryType || null,
          deliveryAddress: deliveryAddress || null,
          deliveryNotes: deliveryNotes || null,
          ...restData,
        },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              company: true,
              leadType: true,
              status: true
            }
          }
        }
      });

      // CRITICAL: Update lead status to QUOTE_SENT
      await tx.lead.update({
        where: { id: targetLeadId },
        data: { 
          status: LeadStatus.QUOTE_SENT,
          updatedAt: new Date()
        }
      });
      console.log('✅ Updated lead status to QUOTE_SENT')

      // Create activity log for quote generation
      if (currentUserId) {
        try {
          await tx.activity.create({
            data: {
              type: ActivityType.QUOTE_GENERATED,
              title: `Devis ${quoteNumber} créé`,
              description: `Devis ${quoteNumber} créé${newClientName ? 
                ` pour le nouveau client ${newClientName}` : 
                ` pour ${existingLead.firstName} ${existingLead.lastName}`}`,
              userId: currentUserId,
              leadId: targetLeadId,
              metadata: {
                quoteId: newQuote.id,
                amount: finalPrice.toString(),
                businessType,
                isNewClient: !leadId
              }
            }
          });
          console.log('✅ Activity created for quote generation')
        } catch (activityError) {
          // Log the error but don't fail the whole transaction
          console.warn('⚠️ Failed to create activity:', activityError)
        }
      } else {
        console.log('⚠️ No user session found, skipping activity creation')
      }

      console.log('🎉 Quote created successfully:', newQuote.id)
      return newQuote;
    });

    // Convert Decimal fields to numbers for JSON response
    const serializedResult = {
      ...result,
      subTotalHT: result.subTotalHT.toNumber(),
      vatAmount: result.vatAmount.toNumber(),
      totalTTC: result.totalTTC.toNumber(),
      finalPrice: result.finalPrice.toNumber(),
    };

    console.log('🚀 Returning successful response with quote ID:', serializedResult.id)
    return NextResponse.json(serializedResult, { status: 201 });

  } catch (error) {
    console.error('💥 Failed to create quote:', error)
    
    // Return specific error messages
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