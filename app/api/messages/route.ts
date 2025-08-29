// app/api/messages/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, senderId, conversationId } = body;

    if (!content || !senderId || !conversationId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const newMessage = await prisma.message.create({
      data: {
        content,
        senderId,
        conversationId,
        readByIds: [senderId], // The sender has "read" their own message
      },
      include: {
        sender: true,
      },
    });
    
    // Trigger a Pusher event on the conversation channel
    await pusherServer.trigger(
      `conversation-${conversationId}`,
      'new-message',
      newMessage
    );
    
    return NextResponse.json(newMessage, { status: 201 });

  } catch (error) {
    console.error('Message creation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
