// app/api/invoices/[id]/download/route.ts - FIXED
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { generateInvoicePDF } from '@/lib/invoice-pdf-generator';

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
        lead: true,
        mission: true
      }
    });

    if (!invoice) {
      return new NextResponse('Invoice not found', { status: 404 });
    }

    const pdfBuffer = await generateInvoicePDF(invoice);

    // Ensure it's a Buffer for NextResponse
    const buffer = pdfBuffer instanceof Uint8Array ? Buffer.from(pdfBuffer) : pdfBuffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Facture_${invoice.invoiceNumber.replace(/\//g, '-')}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Failed to generate invoice PDF:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}