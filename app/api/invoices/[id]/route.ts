// app/api/invoices/[id]/route.ts - MISE À JOUR POUR INCLURE QUOTE
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
      // Dans la fonction GET, remplacez l'include par :
      include: { 
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            address: true,
            leadType: true,
            iceNumber: true,
            materials: true
          }
        },
        mission: {
          select: {
            id: true,
            missionNumber: true,
            status: true,
            scheduledDate: true,
            actualEndTime: true,
            quote: {
              select: {
                id: true,
                quoteNumber: true,
                businessType: true,
                serviceType: true,
                propertyType: true,
                surface: true,
                levels: true,
                lineItems: true,
                subTotalHT: true,
                vatAmount: true,
                totalTTC: true,
                finalPrice: true,
                deliveryType: true,
                lead: {
                  select: {
                    materials: true
                  }
                }
              }
            }
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
    
    const { status, amount, dueDate, description, advanceAmount } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { lead: true, mission: true }
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

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
      const newAmount = new Decimal(amountValue);
      dataToUpdate.amount = newAmount;
      
      const currentAdvance = invoice.advanceAmount;
      dataToUpdate.remainingAmount = newAmount.minus(currentAdvance);
    }

    if (advanceAmount !== undefined) {
      const advanceValue = Number(advanceAmount);
      if (isNaN(advanceValue) || advanceValue < 0) {
        return new NextResponse('Invalid advance amount', { status: 400 });
      }
      
      const newAdvance = new Decimal(advanceValue);
      const totalAmount = dataToUpdate.amount || invoice.amount;
      
      if (newAdvance.greaterThan(totalAmount)) {
        return new NextResponse('Advance cannot exceed total amount', { status: 400 });
      }

      const remaining = totalAmount.minus(newAdvance);
      
      dataToUpdate.advanceAmount = newAdvance;
      dataToUpdate.remainingAmount = remaining;
      
      if (remaining.equals(0)) {
        dataToUpdate.status = 'PAID';
      } else if (newAdvance.greaterThan(0)) {
        dataToUpdate.status = 'SENT';
      }
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

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: dataToUpdate,
      include: {
        lead: true,
        mission: true
      }
    });

    if (advanceAmount !== undefined) {
      const advanceValue = new Decimal(advanceAmount);
      const remaining = updatedInvoice.remainingAmount;
      
      await prisma.activity.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          title: remaining.equals(0) ? 'Facture payée intégralement' : 'Avance reçue',
          description: remaining.equals(0) 
            ? `Facture ${invoice.invoiceNumber} payée intégralement - ${updatedInvoice.amount}MAD`
            : `Avance de ${advanceValue}MAD reçue sur facture ${invoice.invoiceNumber} - Reste: ${remaining}MAD`,
          userId: session.user.id,
          leadId: invoice.leadId,
          metadata: {
            invoiceId: invoice.id,
            advanceAmount: advanceValue.toString(),
            remainingAmount: remaining.toString(),
            totalAmount: updatedInvoice.amount.toString()
          }
        }
      });
    }

    if (status === 'PAID' && invoice.status !== 'PAID') {
      await prisma.lead.update({
        where: { id: invoice.leadId },
        data: { status: 'PAID_OFFICIAL' }
      });

      await prisma.activity.create({
        data: {
          type: 'PAYMENT_RECEIVED',
          title: 'Facture payée',
          description: `Facture ${invoice.invoiceNumber} marquée comme payée - ${invoice.amount}MAD`,
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