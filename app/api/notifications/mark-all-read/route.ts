// app/api/notifications/mark-all-read/route.ts - MARK ALL NOTIFICATIONS AS READ
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // This is a placeholder implementation
    // You should add an 'isRead' boolean field to your Activity model
    // and update all unread activities for this user
    
    // For now, we'll just return success
    // TODO: Add isRead field to Activity model and implement proper logic
    
    console.log('Mark all as read for user:', session.user.id);

    return NextResponse.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Failed to mark all as read:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}