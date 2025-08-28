// app/api/conversations/findOrCreate/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/conversations/findOrCreate - Trouve ou crée une conversation
export async function POST(request: Request) {
  try {
    const { currentUserId, otherUserId } = await request.json();

    if (!currentUserId || !otherUserId) {
      return new NextResponse('Identifiants utilisateurs manquants', { status: 400 });
    }

    // 1. Chercher une conversation existante entre les deux utilisateurs
    let conversation = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: currentUserId } } },
          { participants: { some: { id: otherUserId } } },
        ],
      },
      include: {
        participants: true,
        messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
        },
      },
    });

    // 2. Si aucune conversation n'existe, en créer une nouvelle
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [
              { id: currentUserId },
              { id: otherUserId },
            ],
          },
        },
        include: {
          participants: true,
          messages: true, // Sera vide au début
        },
      });
    }

    return NextResponse.json(conversation);

  } catch (error) {
    console.error('Erreur findOrCreate conversation:', error);
    return new NextResponse('Erreur interne du serveur', { status: 500 });
  }
}