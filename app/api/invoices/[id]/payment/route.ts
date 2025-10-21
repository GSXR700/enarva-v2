// app/api/invoices/[id]/payment/route.ts - NEW FILE
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { paymentAmount, paymentType } = body;

    if (!paymentAmount || paymentAmount <= 0) {
      return new NextResponse('Invalid payment amount', { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lead: true, mission: true }
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return new NextResponse('Invoice already paid', { status: 400 });
    }

    const payment = new Decimal(paymentAmount);
    const currentAdvance = invoice.advanceAmount;
    const newAdvance = currentAdvance.plus(payment);

    if (newAdvance.greaterThan(invoice.amount)) {
      return new NextResponse('Payment exceeds remaining amount', { status: 400 });
    }

    const remaining = invoice.amount.minus(newAdvance);
    const isPaid = remaining.equals(0);

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        advanceAmount: newAdvance,
        remainingAmount: remaining,
        status: isPaid ? 'PAID' : 'SENT',
        updatedAt: new Date()
      },
      include: {
        lead: true,
        mission: true
      }
    });

    if (isPaid) {
      await prisma.lead.update({
        where: { id: invoice.leadId },
        data: { status: 'PAID_OFFICIAL' }
      });
    }

    await prisma.activity.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: isPaid ? 'Facture payée intégralement' : 'Paiement reçu',
        description: isPaid
          ? `Facture ${invoice.invoiceNumber} payée intégralement - ${invoice.amount} MAD`
          : `Paiement de ${payment} MAD reçu sur facture ${invoice.invoiceNumber} - Reste: ${remaining} MAD`,
        userId: session.user.id,
        leadId: invoice.leadId,
        metadata: {
          invoiceId: invoice.id,
          paymentAmount: payment.toString(),
          paymentType: paymentType || 'CASH',
          advanceAmount: newAdvance.toString(),
          remainingAmount: remaining.toString(),
          totalAmount: invoice.amount.toString(),
          isPaid
        }
      }
    });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      message: isPaid ? 'Facture payée intégralement' : 'Paiement enregistré avec succès'
    });

  } catch (error) {
    console.error('Failed to process payment:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}