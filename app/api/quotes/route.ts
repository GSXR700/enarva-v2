//app/api/quotes/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient, QuoteType, LeadStatus, ActivityType, PropertyType, ProductQuoteCategory, DeliveryType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

const prisma = new PrismaClient()

// Enhanced validation schema for quote creation
const createQuoteSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required').optional(),
  newClientName: z.string().min(1, 'Client name is required').optional(),
  newClientEmail: z.string().email('Valid email required').optional().nullable(),
  newClientPhone: z.string().min(10, 'Valid phone number required').optional(),
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
  
  // PropertyType enum validation
  propertyType: z.enum([
    'APARTMENT_SMALL', 'APARTMENT_MEDIUM', 'APARTMENT_MULTI', 'APARTMENT_LARGE',
    'VILLA_SMALL', 'VILLA_MEDIUM', 'VILLA_LARGE', 'PENTHOUSE',
    'COMMERCIAL', 'STORE', 'HOTEL_STANDARD', 'HOTEL_LUXURY', 'OFFICE',
    'RESIDENCE_B2B', 'BUILDING', 'RESTAURANT', 'WAREHOUSE', 'OTHER'
  ]).optional().nullable(),
  
  // ProductQuoteCategory enum validation
  productCategory: z.enum([
    'FURNITURE', 'EQUIPMENT', 'CONSUMABLES', 'ELECTRONICS', 'DECORATION',
    'TEXTILES', 'LIGHTING', 'STORAGE', 'KITCHEN_ITEMS', 'BATHROOM_ITEMS',
    'OFFICE_SUPPLIES', 'OTHER'
  ]).optional().nullable(),
  
  productDetails: z.any().optional().nullable(),
  
  // DeliveryType enum validation
  deliveryType: z.enum([
    'PICKUP', 'STANDARD_DELIVERY', 'EXPRESS_DELIVERY', 'SCHEDULED_DELIVERY', 'WHITE_GLOVE'
  ]).optional().nullable(),
  
  deliveryAddress: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
}).refine((data) => {
  // Either leadId or newClientName must be provided
  return data.leadId || data.newClientName;
}, {
  message: "Either an existing lead must be selected or new client name must be provided"
});

// GET /api/quotes - Récupère tous les devis
export async function GET() {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
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
        },
        missions: {
          select: {
            id: true,
            missionNumber: true,
            status: true,
            scheduledDate: true
          }
        }
      },
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

    console.log('Starting quote creation process...')
    const body = await request.json()
    console.log('Received quote data:', body)

    let validatedData;
    try {
      validatedData = createQuoteSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        console.error('Validation failed:', validationError.flatten().fieldErrors)
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

      // Create new lead if no leadId provided but newClientName exists
      if (!leadId && newClientName && newClientName.trim()) {
        console.log('Creating new lead for:', newClientName.trim())
        
        // Extract first and last name from full name
        const nameParts = newClientName.trim().split(' ');
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || 'Nouveau';

        // Create new lead with provided information
        const newLead = await tx.lead.create({
          data: {
            firstName,
            lastName,
            phone: newClientPhone || 'À renseigner',
            email: newClientEmail || null,
            address: newClientAddress || null,
            status: LeadStatus.QUOTE_SENT, // Set appropriate status for quote sent
            leadType: 'PARTICULIER',
            channel: 'FORMULAIRE_SITE',
            originalMessage: `Lead créé automatiquement lors de la création du devis ${quoteNumber}`,
            score: 50, // Default score for new leads from quote creation
            propertyType: propertyType as PropertyType || null,
            
          }
        });

        targetLeadId = newLead.id;
        console.log('Created new lead with ID:', targetLeadId)
      }

      // Ensure we have a valid leadId
      if (!targetLeadId) {
        throw new Error('Lead ID is required');
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

      console.log('Creating quote for lead:', targetLeadId)

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
          expiresAt: expiresAt ? new Date(expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
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

      // Update lead status to QUOTE_SENT if not already set
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

      // Create activity log for quote generation
      if (currentUserId) {
        try {
          await tx.activity.create({
            data: {
              type: ActivityType.QUOTE_GENERATED,
              title: `Devis ${quoteNumber} créé`,
              description: `Devis ${quoteNumber} créé${newClientName ? ` pour le nouveau client ${newClientName}` : ` pour ${existingLead.firstName} ${existingLead.lastName}`}`,
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

    // Convert Decimal fields to numbers for JSON response
    const serializedResult = {
      ...result,
      subTotalHT: result.subTotalHT.toNumber(),
      vatAmount: result.vatAmount.toNumber(),
      totalTTC: result.totalTTC.toNumber(),
      finalPrice: result.finalPrice.toNumber(),
    };

    return NextResponse.json(serializedResult, { status: 201 });

  } catch (error) {
    console.error('Failed to create quote:', error)
    
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