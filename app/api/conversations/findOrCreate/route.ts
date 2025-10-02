// app/api/conversations/findOrCreate/route.ts - COMPLETE FIXED VERSION
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const { currentUserId, otherUserId, missionId } = await request.json()

    if (!currentUserId || !otherUserId) {
      return new NextResponse('Current user ID and other user ID are required', { status: 400 })
    }

    // Validate user IDs are strings
    const validatedCurrentUserId = String(currentUserId)
    const validatedOtherUserId = String(otherUserId)
    const validatedMissionId = missionId ? String(missionId) : null

    // ✅ FIXED: Type definition with missionId as nullable
    type ConversationWithDetails = {
      id: string
      missionId: string | null  // ✅ Changed from string to string | null
      isActive: boolean
      createdAt: Date
      updatedAt: Date
      participants: { 
        id: string
        name: string | null
        email: string | null
        image: string | null
        role: string 
      }[]
      messages: { 
        id: string
        content: string
        createdAt: Date
        senderId: string
        isRead: boolean 
      }[]
    } | null

    // 1. Search for existing conversation between these two users
    let conversation: ConversationWithDetails = await prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { id: validatedCurrentUserId } } },
          { participants: { some: { id: validatedOtherUserId } } },
          // If missionId provided, match it; otherwise match conversations without missions
          validatedMissionId 
            ? { missionId: validatedMissionId }
            : { missionId: null }
        ],
      },
      include: {
        participants: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
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

    // 2. If no conversation exists, create one
    if (!conversation) {
      const createData: any = {
        participants: {
          connect: [
            { id: validatedCurrentUserId },
            { id: validatedOtherUserId },
          ],
        },
        isActive: true,
      }

      // Only connect mission if missionId is provided
      if (validatedMissionId) {
        createData.mission = { connect: { id: validatedMissionId } }
      }

      conversation = await prisma.conversation.create({
        data: createData,
        include: {
          participants: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
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
    console.error('Error in findOrCreate conversation:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}