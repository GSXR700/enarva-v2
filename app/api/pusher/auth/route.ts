//app/api/pusher/auth/route.ts
import { pusherServer } from '@/lib/pusher';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.name) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const socketId = (await request.formData()).get('socket_id') as string;
  const channel = (await request.formData()).get('channel_name') as string;

  const userData = {
    user_id: session.user.id,
    user_info: {
      name: session.user.name,
      image: session.user.image,
    },
  };

  // Update user's last seen status upon authenticating with Pusher
  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSeen: new Date(), onlineStatus: 'ONLINE' },
  });

  const authResponse = pusherServer.authorizeChannel(socketId, channel, userData);

  return NextResponse.json(authResponse);
}