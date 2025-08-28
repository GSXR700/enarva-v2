// app/api/conversations/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/conversations/[id] - Récupère une conversation spécifique
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id

    if (!conversationId) {
      return new NextResponse('Conversation ID is required', { status: 400 })
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!conversation) {
      return new NextResponse('Conversation not found', { status: 404 })
    }
    
    return NextResponse.json(conversation)
  } catch (error) {
    console.error(`Failed to fetch conversation ${params.id}:`, error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
