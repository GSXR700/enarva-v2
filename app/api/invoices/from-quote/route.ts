// app/api/invoices/from-quote/route.ts - FIXED WITH PROPER ERROR HANDLING
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Helper function to generate invoice number in F-NUM/YEAR format
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  try {
    // Get the count of invoices created this year
    const invoiceCount = await prisma.invoice.count({
      where: {
        invoiceNumber: {
          endsWith: `/${year}`
        }
      }
    });
    
    const nextNumber = invoiceCount + 1;
    return `F-${nextNumber}/${year}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { quoteId } = body;

    if (!quoteId) {
      return NextResponse.json({ error: 'Quote ID is required' }, { status: 400 });
    }

    console.log('📝 Creating invoice from quote:', quoteId);

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            address: true
          }
        },
        missions: {
          select: {
            id: true,
            missionNumber: true,
            status: true
          }
        }
      }
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Check if invoice already exists for this quote
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        leadId: quote.leadId,
        amount: quote.finalPrice,
        description: {
          contains: quote.quoteNumber || ''
        }
      }
    });

    if (existingInvoice) {
      console.log('⚠️ Invoice already exists for this quote');
      return NextResponse.json({
        success: false,
        message: 'Une facture existe déjà pour ce devis',
        invoice: existingInvoice
      }, { status: 409 });
    }

    // Find associated mission if exists
    const mission = quote.missions.find(m => 
      m.status === 'COMPLETED' || m.status === 'QUALITY_CHECK'
    );

    // Generate invoice number in F-NUM/YEAR format
    const invoiceNumber = await generateInvoiceNumber();
    const amount = new Decimal(quote.finalPrice.toString());

    console.log('📄 Generating invoice:', invoiceNumber, 'for amount:', amount.toString());

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        leadId: quote.leadId,
        ...(mission && { missionId: mission.id }),
        amount: amount,
        status: 'SENT',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        description: `Facture depuis devis ${quote.quoteNumber || 'N/A'}${
          quote.businessType === 'SERVICE' 
            ? ' - Prestation de nettoyage' 
            : ' - Vente de produits'
        }`,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true
          }
        },
        mission: {
          select: {
            id: true,
            missionNumber: true,
            status: true
          }
        }
      }
    });

    // Update mission if exists
    if (mission) {
      await prisma.mission.update({
        where: { id: mission.id },
        data: {
          invoiceGenerated: true,
          invoiceId: invoice.id,
          updatedAt: new Date()
        }
      });
    }

    // Update lead status
    await prisma.lead.update({
      where: { id: quote.leadId },
      data: {
        status: 'PENDING_PAYMENT',
        updatedAt: new Date()
      }
    });

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Facture créée depuis devis',
        description: `Facture ${invoiceNumber} créée depuis le devis ${quote.quoteNumber || 'N/A'} pour ${quote.lead.firstName} ${quote.lead.lastName} - Montant: ${amount}€`,
        userId: session.user.id,
        leadId: quote.leadId,
        metadata: {
          invoiceId: invoice.id,
          quoteId: quoteId,
          amount: amount.toString(),
          invoiceNumber
        }
      }
    });

    console.log('✅ Invoice created successfully:', invoiceNumber);

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Facture créée avec succès'
    }, { status: 201 });

  } catch (error) {
    console.error('❌ Failed to create invoice from quote:', error);
    
    // Return proper JSON error response
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Une erreur est survenue',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
    
  } finally {
    await prisma.$disconnect();
  }
}