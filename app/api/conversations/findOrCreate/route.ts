// app/api/conversations/findOrCreate/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/conversations/findOrCreate - Find or create a conversation
export async function POST(request: Request) {
  try {
    const { currentUserId, otherUserId, missionId } = await request.json()

    if (!currentUserId || !otherUserId || !missionId) {
      return new NextResponse('Identifiants utilisateurs ou mission manquants', { status: 400 })
    }

    // Ensure IDs are strings
    const validatedCurrentUserId = String(currentUserId)
    const validatedOtherUserId = String(otherUserId)
    const validatedMissionId = String(missionId)

    // Define the type for conversation to match Prisma's include structure
    type ConversationWithDetails = {
      id: string
      missionId: string
      isActive: boolean
      createdAt: Date
      updatedAt: Date
      participants: { id: string; name: string | null; email: string | null }[]
      messages: { id: string; content: string; createdAt: Date; senderId: string; isRead: boolean }[]
    } | null

    // 1. Check for existing conversation between the two users
    let conversation: ConversationWithDetails = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: validatedCurrentUserId } } },
          { participants: { some: { id: validatedOtherUserId } } },
          { missionId: validatedMissionId },
        ],
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            isRead: true,
          },
        },
      },
    })

    // 2. If no conversation exists, create a new one
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          participants: {
            connect: [
              { id: validatedCurrentUserId },
              { id: validatedOtherUserId },
            ],
          },
          mission: { connect: { id: validatedMissionId } },
          messages: { create: [] }, // Initialize empty messages array
          isActive: true,
        },
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          messages: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              isRead: true,
            },
          },
        },
      })
    }

    return NextResponse.json(conversation)

  } catch (error) {
    console.error('Erreur findOrCreate conversation:', error)
    return new NextResponse('Erreur interne du serveur', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}