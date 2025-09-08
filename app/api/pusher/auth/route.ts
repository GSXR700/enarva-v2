import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.formData();
    const socketId = body.get('socket_id') as string;
    const channel = body.get('channel_name') as string;

    // FIX: Verify that the user exists in the database before proceeding.
    // This prevents errors if the session is valid but the user has been deleted (e.g., after a db reset).
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return new NextResponse('User not found in database', { status: 404 });
    }

    const data = {
      user_id: user.id,
      user_info: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
      },
    };

    // Update user's presence status
    await prisma.user.update({
      where: { id: user.id },
      data: { lastSeen: new Date(), onlineStatus: 'ONLINE' },
    });

    const authResponse = pusherServer.authorizeChannel(socketId, channel, data);
    return NextResponse.json(authResponse);

  } catch (error) {
    console.error('Pusher auth error:', error);
    // Provide a generic error response to avoid leaking implementation details
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}