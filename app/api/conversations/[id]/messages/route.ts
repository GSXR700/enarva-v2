// app/api/conversations/[id]/messages/route.ts
import { NextResponse, NextRequest } from 'next/server'; // Correction: Import de NextRequest
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/conversations/[id]/messages - Récupère les messages d'une conversation
export async function GET(
  request: NextRequest, // Correction: Utilisation du type NextRequest
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id;

    if (!conversationId) {
        return new NextResponse('Conversation ID is required', { status: 400 });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId: conversationId,
      },
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    return NextResponse.json(messages);
  } catch (error) {
    console.error(`Failed to fetch messages for conversation ${params.id}:`, error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}