// app/api/notifications/unread-count/route.ts - GET UNREAD NOTIFICATIONS COUNT
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Count unread activities for the user
    const unreadCount = await prisma.activity.count({
      where: {
        userId: session.user.id,
        // Add isRead field to Activity model if it doesn't exist
        // For now, count recent activities from last 7 days
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return NextResponse.json({ count: unreadCount });
  } catch (error) {
    console.error('Failed to get unread count:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}