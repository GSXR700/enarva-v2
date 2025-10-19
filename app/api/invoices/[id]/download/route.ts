// app/api/invoices/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateInvoicePDF } from '@/lib/invoice-pdf-generator';

const prisma = new PrismaClient();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        lead: true,
        mission: {
          include: {
            quote: true
          }
        }
      }
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    // Generate the PDF with enhanced layout
    const pdfBuffer = generateInvoicePDF(invoice);

    const buffer = pdfBuffer instanceof Uint8Array ? Buffer.from(pdfBuffer) : pdfBuffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Facture_${invoice.invoiceNumber}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}