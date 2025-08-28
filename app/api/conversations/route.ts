// app/api/conversations/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/conversations - Récupère toutes les conversations
export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Pour afficher le dernier message
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })
    return NextResponse.json(conversations)
  } catch (error) {
    console.error('Failed to fetch conversations:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}