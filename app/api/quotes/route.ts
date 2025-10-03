//app/api/quotes/route.ts - ENHANCED VERSION WITH B2B AND PURCHASE ORDER SUPPORT
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { PrismaClient, QuoteType, LeadStatus, LeadType, ActivityType, PropertyType, ProductQuoteCategory, DeliveryType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { z } from 'zod'

const prisma = new PrismaClient()

// ENHANCED: Validation schema with B2B and purchase order fields
const createQuoteSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required').optional(),
  
  // Basic new client fields
  newClientName: z.string().min(1, 'Client name is required').optional(),
  newClientEmail: z.string().email('Valid email required').optional().nullable(),
  newClientPhone: z.string().min(8, 'Valid phone number required').optional(),
  newClientAddress: z.string().optional().nullable(),
  newClientLeadType: z.nativeEnum(LeadType).optional(),
  
  // B2B specific fields - NEW
  newClientCompany: z.string().optional().nullable(),
  newClientIceNumber: z.string().length(15, 'ICE must be exactly 15 digits').optional().nullable(),
  newClientActivitySector: z.string().optional().nullable(),
  newClientContactPosition: z.string().optional().nullable(),
  newClientDepartment: z.string().optional().nullable(),
  
  // Quote fields
  quoteNumber: z.string().min(1, 'Quote number is required'),
  businessType: z.enum(['SERVICE', 'PRODUCT']).default('SERVICE'),
  lineItems: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.1, 'Quantity must be positive'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
    totalPrice: z.number().min(0, 'Total price must be positive')
  })).min(1, 'At least one line item required'),
  
  // Financial fields
  subTotalHT: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  vatAmount: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  totalTTC: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),
  finalPrice: z.union([z.number(), z.string()]).transform((val) => new Decimal(val)),

  expiresAt: z.coerce.date().optional(),
  type: z.enum(['EXPRESS', 'STANDARD', 'PREMIUM']).optional(),
  
  // Service specific
  surface: z.number().optional(),
  levels: z.number().optional(),
  propertyType: z.nativeEnum(PropertyType).optional().nullable(),
  
  // Product specific
  productCategory: z.nativeEnum(ProductQuoteCategory).optional().nullable(),
  productDetails: z.any().optional(),
  deliveryType: z.nativeEnum(DeliveryType).optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
  
  // Purchase Order fields - NEW
  purchaseOrderNumber: z.string().optional().nullable(),
  orderedBy: z.string().optional().nullable(),
}).refine(
  (data) => data.leadId || (data.newClientName && data.newClientPhone),
  {
    message: "Either leadId or complete new client information (name and phone) is required",
    path: ["leadId"]
  }
)

// GET /api/quotes - Récupère tous les devis
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
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
            leadType: true,
            iceNumber: true
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
  } finally {
    await prisma.$disconnect()
  }
}

// POST /api/quotes - Crée un nouveau devis avec support B2B et bon de commande
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    const currentUserId = session?.user?.id

    console.log('🚀 Starting quote creation process...')
    const body = await request.json()
    console.log('📥 Received quote data:', body)

    // Validate the incoming data
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
      newClientLeadType,
      // B2B fields - NEW
      newClientCompany,
      newClientIceNumber,
      newClientActivitySector,
      newClientContactPosition,
      newClientDepartment,
      // Quote fields
      quoteNumber, 
      businessType,
      lineItems, 
      subTotalHT, 
      vatAmount, 
      totalTTC, 
      finalPrice, 
      expiresAt, 
      type,
      surface,
      levels,
      propertyType,
      productCategory,
      productDetails,
      deliveryType,
      deliveryAddress,
      deliveryNotes,
      // Purchase Order fields - NEW
      purchaseOrderNumber,
      orderedBy
    } = validatedData;

    // Execute the quote creation in a transaction
    const result = await prisma.$transaction(async (tx) => {
      let targetLeadId: string = leadId || '';

      // Create new lead if no leadId provided
      if (!leadId && newClientName && newClientName.trim() && newClientPhone && newClientPhone.trim()) {
        console.log('👤 Creating new lead for:', newClientName.trim(), '- Type:', newClientLeadType || 'PARTICULIER')
        
        // Extract first and last name from full name
        const nameParts = newClientName.trim().split(' ');
        const firstName = nameParts[0] || 'Client';
        const lastName = nameParts.slice(1).join(' ') || 'Nouveau';

        // Validate phone number
        const cleanPhone = newClientPhone.trim();
        if (cleanPhone.length < 8) {
          throw new Error('Le numéro de téléphone doit contenir au moins 8 caractères');
        }

        // Validate ICE if provided
        if (newClientIceNumber && newClientIceNumber.trim().length !== 15) {
          throw new Error('Le numéro ICE doit contenir exactement 15 chiffres');
        }

        // Build lead data object
        const leadData: any = {
          firstName,
          lastName,
          phone: cleanPhone,
          email: newClientEmail && newClientEmail.trim() ? newClientEmail.trim() : null,
          address: newClientAddress && newClientAddress.trim() ? newClientAddress.trim() : null,
          status: LeadStatus.NEW,
          leadType: newClientLeadType || LeadType.PARTICULIER,
          channel: 'FORMULAIRE_SITE',
          originalMessage: `Lead créé automatiquement lors de la création du devis ${quoteNumber}`,
          score: 50,
          propertyType: propertyType as PropertyType || null,
        }

        // Add B2B specific fields if not PARTICULIER
        if (newClientLeadType && newClientLeadType !== LeadType.PARTICULIER) {
          leadData.company = newClientCompany && newClientCompany.trim() ? newClientCompany.trim() : null
          leadData.iceNumber = newClientIceNumber && newClientIceNumber.trim() ? newClientIceNumber.trim() : null
          leadData.activitySector = newClientActivitySector && newClientActivitySector.trim() ? newClientActivitySector.trim() : null
          leadData.contactPosition = newClientContactPosition && newClientContactPosition.trim() ? newClientContactPosition.trim() : null
          leadData.department = newClientDepartment && newClientDepartment.trim() ? newClientDepartment.trim() : null
          
          console.log('🏢 Adding B2B fields:', {
            company: leadData.company,
            iceNumber: leadData.iceNumber,
            activitySector: leadData.activitySector
          })
        }

        // Create new lead
        const newLead = await tx.lead.create({
          data: leadData
        });

        targetLeadId = newLead.id;
        console.log('✅ Created new lead with ID:', targetLeadId)
      }

      // Ensure we have a valid leadId
      if (!targetLeadId) {
        throw new Error('Lead ID is required - either provide existing leadId or complete new client information');
      }

      // Verify the lead exists
      const existingLead = await tx.lead.findUnique({
        where: { id: targetLeadId },
        select: { 
          id: true, 
          status: true, 
          firstName: true, 
          lastName: true,
          phone: true,
          email: true,
          company: true,
          leadType: true
        }
      });

      if (!existingLead) {
        throw new Error(`Lead with ID ${targetLeadId} not found`);
      }

      console.log('📋 Creating quote for lead:', existingLead.firstName, existingLead.lastName)

      // Build quote data
      const quoteData: any = {
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
      }

      // Add purchase order data if provided - Store in productDetails
      if (purchaseOrderNumber && orderedBy) {
        console.log('📄 Adding purchase order info:', { purchaseOrderNumber, orderedBy })
        quoteData.productDetails = {
          ...productDetails,
          purchaseOrder: {
            number: purchaseOrderNumber,
            orderedBy: orderedBy
          }
        }
      }

      // Create the quote
      const newQuote = await tx.quote.create({
        data: quoteData,
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
              iceNumber: true,
              status: true
            }
          }
        }
      });

      // Update lead status to QUOTE_SENT
      await tx.lead.update({
        where: { id: targetLeadId },
        data: { 
          status: LeadStatus.QUOTE_SENT,
          updatedAt: new Date()
        }
      });
      console.log('✅ Updated lead status to QUOTE_SENT')

      // Create activity log
      if (currentUserId) {
        try {
          await tx.activity.create({
            data: {
              type: ActivityType.QUOTE_GENERATED,
              title: `Devis ${quoteNumber} créé`,
              description: `Devis ${quoteNumber} créé${newClientName ? ` pour ${newClientName}` : ` pour ${existingLead.firstName} ${existingLead.lastName}`}${purchaseOrderNumber ? ` (BC: ${purchaseOrderNumber})` : ''}`,
              userId: currentUserId,
              leadId: targetLeadId,
              metadata: {
                quoteId: newQuote.id,
                quoteNumber,
                businessType,
                finalPrice: finalPrice.toString(),
                isNewClient: !leadId,
                leadType: existingLead.leadType,
                hasPurchaseOrder: !!purchaseOrderNumber
              }
            }
          });
          console.log('✅ Activity log created')
        } catch (activityError) {
          console.error('⚠️ Failed to create activity log:', activityError)
        }
      }

      return newQuote;
    });

    console.log('✅ Quote created successfully:', result.quoteNumber)

    // Serialize Decimal fields for JSON response
    const serializedQuote = {
      ...result,
      subTotalHT: result.subTotalHT.toNumber(),
      vatAmount: result.vatAmount.toNumber(),
      totalTTC: result.totalTTC.toNumber(),
      finalPrice: result.finalPrice.toNumber(),
    };

    return NextResponse.json(serializedQuote, { status: 201 });

  } catch (error) {
    console.error('❌ Error creating quote:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Quote creation failed', 
          message: error.message 
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}