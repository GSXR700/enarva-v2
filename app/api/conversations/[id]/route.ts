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
          take: 1, // Pour afficher le dernier message
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

// PATCH /api/conversations/[id] - Met à jour une conversation
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id
    const body = await request.json()

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: body,
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
    
    return NextResponse.json(updatedConversation)
  } catch (error) {
    console.error(`Failed to update conversation ${params.id}:`, error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// DELETE /api/conversations/[id] - Supprime une conversation
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = params.id

    await prisma.conversation.delete({
      where: { id: conversationId },
    })
    
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error(`Failed to delete conversation ${params.id}:`, error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}