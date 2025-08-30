// app/api/messages/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { pusherServer } from '@/lib/pusher';
import webpush from 'web-push';

const prisma = new PrismaClient();

// Conditionally configure web-push only if VAPID keys are available
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@enarva.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys not configured. Push notifications are disabled.');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { content, senderId, conversationId } = body;

    if (!content || !senderId || !conversationId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    const [newMessage, conversation] = await prisma.$transaction([
      prisma.message.create({
        data: {
          content,
          senderId,
          conversationId,
          readByIds: [senderId],
        },
        include: {
          sender: true,
        },
      }),
      prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true },
      }),
    ]);
    
    await pusherServer.trigger(
      `conversation-${conversationId}`,
      'new-message',
      newMessage
    );

    // Send push notification only if keys are set
    if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
        const recipients = conversation?.participants.filter(p => p.id !== senderId);
        if (recipients) {
          const notificationPayload = JSON.stringify({
            title: `Nouveau message de ${newMessage.sender.name}`,
            body: content,
          });

          for (const recipient of recipients) {
            if (recipient.pushSubscription) {
              try {
                await webpush.sendNotification(recipient.pushSubscription as any, notificationPayload);
              } catch (error) {
                console.error(`Failed to send push notification to ${recipient.id}`, error);
              }
            }
          }
        }
    }
    
    return NextResponse.json(newMessage, { status: 201 });

  } catch (error) {
    console.error('Message creation error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}