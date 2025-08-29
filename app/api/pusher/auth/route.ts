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

  const data = await request.text();
  const [socketId, channel] = data.split('&').map(str => str.split('=')[1]);

  const userData = {
    user_id: session.user.id,
    user_info: {
      name: session.user.name,
      image: session.user.image,
    },
  };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastSeen: new Date(), onlineStatus: 'ONLINE' },
  });

  const authResponse = pusherServer.authorizeChannel(socketId, channel, userData);

  return NextResponse.json(authResponse);
}