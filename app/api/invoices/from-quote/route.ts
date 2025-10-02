// app/api/invoices/from-quote/route.ts - FIXED
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { quoteId } = body;

    if (!quoteId) {
      return new NextResponse('Quote ID is required', { status: 400 });
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
      return new NextResponse('Quote not found', { status: 404 });
    }

    if (quote.status !== 'ACCEPTED') {
      return new NextResponse('Quote must be accepted before creating invoice', { status: 400 });
    }

    // FIXED: Check without quoteId field
    const existingInvoice = await prisma.invoice.findFirst({
      where: {
        leadId: quote.leadId,
        amount: quote.finalPrice,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
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

    const mission = quote.missions.find(m => 
      m.status === 'COMPLETED' || m.status === 'QUALITY_CHECK'
    );

    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const invoiceNumber = `INV-${year}-${randomNum}`;

    const amount = new Decimal(quote.finalPrice.toString());

    // FIXED: missionId can be null, handle properly
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        leadId: quote.leadId,
        ...(mission && { missionId: mission.id }),
        amount: amount,
        status: 'SENT',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: `Facture générée depuis le devis ${quote.quoteNumber || 'N/A'}${
          quote.businessType === 'SERVICE' 
            ? ` - Prestation de nettoyage` 
            : ` - Vente de produits`
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

    await prisma.lead.update({
      where: { id: quote.leadId },
      data: {
        status: 'PENDING_PAYMENT',
        updatedAt: new Date()
      }
    });

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
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}