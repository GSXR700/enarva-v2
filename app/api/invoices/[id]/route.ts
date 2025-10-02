// app/api/invoices/[id]/route.ts - FIXED with proper error handling and validation
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function GET(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    
    const invoice = await prisma.invoice.findUnique({ 
      where: { id },
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
        mission: {
          select: {
            id: true,
            missionNumber: true,
            status: true,
            scheduledDate: true,
            actualEndTime: true
          }
        }
      }
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Failed to fetch invoice:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PATCH(
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
    
    const { status, amount, dueDate, description } = body;

    const dataToUpdate: any = {};

    if (status) {
      if (!['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].includes(status)) {
        return new NextResponse('Invalid status value', { status: 400 });
      }
      dataToUpdate.status = status;
    }

    if (amount !== undefined) {
      const amountValue = Number(amount);
      if (isNaN(amountValue) || amountValue < 0) {
        return new NextResponse('Invalid amount value', { status: 400 });
      }
      dataToUpdate.amount = new Decimal(amountValue);
    }

    if (dueDate) {
      const dueDateValue = new Date(dueDate);
      if (isNaN(dueDateValue.getTime())) {
        return new NextResponse('Invalid due date', { status: 400 });
      }
      dataToUpdate.dueDate = dueDateValue;
    }

    if (description !== undefined) {
      dataToUpdate.description = description;
    }

    dataToUpdate.updatedAt = new Date();

    if (Object.keys(dataToUpdate).length === 1) {
      return new NextResponse('No update data provided', { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lead: true, mission: true }
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: dataToUpdate,
      include: {
        lead: true,
        mission: true
      }
    });

    if (status === 'PAID' && invoice.status !== 'PAID') {
      await prisma.lead.update({
        where: { id: invoice.leadId },
        data: { status: 'PAID_OFFICIAL' }
      });

      await prisma.activity.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          title: 'Facture payée',
          description: `Facture ${invoice.invoiceNumber} marquée comme payée - ${invoice.amount}€`,
          userId: session.user.id,
          leadId: invoice.leadId,
          metadata: {
            invoiceId: invoice.id,
            amount: invoice.amount.toString(),
            previousStatus: invoice.status
          }
        }
      });
    }

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error('Failed to update invoice:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(session.user.role || '')) {
      return new NextResponse('Forbidden - Admin access required', { status: 403 });
    }

    const { id } = await params;
    
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { mission: true }
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return new NextResponse('Cannot delete paid invoice', { status: 400 });
    }

    if (invoice.mission) {
      await prisma.mission.update({
        where: { id: invoice.mission.id },
        data: {
          invoiceGenerated: false,
          invoiceId: null
        }
      });
    }

    await prisma.invoice.delete({
      where: { id }
    });

    await prisma.activity.create({
      data: {
        type: 'PAYMENT_RECEIVED',
        title: 'Facture supprimée',
        description: `Facture ${invoice.invoiceNumber} supprimée`,
        userId: session.user.id,
        leadId: invoice.leadId,
        metadata: {
          invoiceId: id,
          invoiceNumber: invoice.invoiceNumber
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}