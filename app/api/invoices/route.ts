// app/api/invoices/route.ts - UPDATED WITH ADVANCE SYSTEM
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// Helper function to generate invoice number in F-NUM/YEAR format
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  
  const invoiceCount = await prisma.invoice.count({
    where: {
      invoiceNumber: {
        endsWith: `/${year}`
      }
    }
  });
  
  const nextNumber = invoiceCount + 1;
  return `F-${nextNumber}/${year}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');

    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (leadId) {
      whereClause.leadId = leadId;
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
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
            status: true,
            scheduledDate: true,
            actualEndTime: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('Creating invoice:', body);

    const { missionId, leadId, amount, description } = body;

    if (!missionId || !leadId || !amount) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        lead: true,
        quote: true
      }
    });

    if (!mission) {
      return new NextResponse('Mission not found', { status: 404 });
    }

    if (mission.invoiceGenerated) {
      return new NextResponse('Invoice already exists for this mission', { status: 409 });
    }

    const invoiceNumber = await generateInvoiceNumber();
    const totalAmount = new Decimal(amount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        leadId,
        missionId,
        amount: totalAmount,
        advanceAmount: new Decimal(0),
        remainingAmount: totalAmount,
        status: 'SENT',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        description: description || `Facture pour la mission ${mission.missionNumber}`
      },
      include: {
        lead: true,
        mission: true
      }
    });

    await prisma.mission.update({
      where: { id: missionId },
      data: {
        invoiceGenerated: true,
        invoiceId: invoice.id
      }
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'PENDING_PAYMENT'
      }
    });

    await prisma.activity.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Facture créée',
        description: `Facture ${invoiceNumber} créée pour ${mission.lead.firstName} ${mission.lead.lastName}`,
        userId: session.user.id,
        leadId: leadId,
        metadata: {
          invoiceId: invoice.id,
          missionId,
          amount: amount.toString()
        }
      }
    });

    return NextResponse.json(invoice, { status: 201 });

  } catch (error) {
    console.error('Failed to create invoice:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}