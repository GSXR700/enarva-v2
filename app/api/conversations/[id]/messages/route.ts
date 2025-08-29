// app/api/conversations/[id]/messages/route.ts - COMPLETE FIXED VERSION
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/conversations/[id]/messages - Récupère les messages d'une conversation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params; // ✅ Await params for Next.js 15

    if (!conversationId) {
      return new NextResponse('Conversation ID is required', { status: 400 })
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
    })
    
    return NextResponse.json(messages)
  } catch (error) {
    console.error(`Failed to fetch messages for conversation:`, error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}