// app/api/quotes/[id]/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateQuotePDF, prepareQuotePDFData } from '@/lib/pdf-generator';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the quote with related data
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lead: true,
      },
    });

    if (!quote) {
      return new NextResponse('Quote not found', { status: 404 });
    }

    // Prepare the data for PDF generation
    const pdfData = prepareQuotePDFData(quote);

    // Generate the PDF (Uint8Array or Buffer)
    const pdfBuffer = generateQuotePDF(pdfData);

    // Ensure it's a Buffer so NextResponse accepts it
    const buffer =
      pdfBuffer instanceof Uint8Array ? Buffer.from(pdfBuffer) : pdfBuffer;

    // Return the PDF as a download
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Devis_${quote.quoteNumber}.pdf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return new NextResponse('Failed to generate PDF', { status: 500 });
  }
}