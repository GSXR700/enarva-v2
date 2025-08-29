//app/api/push/subscribe/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const subscription = await request.json();
    if (!subscription) {
      return new NextResponse('Missing push subscription in body', { status: 400 });
    }
    
    await prisma.user.update({
      where: { id: session.user.id },
      data: { pushSubscription: subscription },
    });

    return NextResponse.json({ message: 'Subscription saved' }, { status: 200 });
  } catch (error) {
    console.error('Failed to save push subscription:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}