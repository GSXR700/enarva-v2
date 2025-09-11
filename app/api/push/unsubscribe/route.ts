// app/api/push/unsubscribe/route.ts - PUSH UNSUBSCRIPTION API (FIXED)
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Remove subscription from user - FIX: Proper null handling
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        pushSubscription: null as any // Fix: Cast to any to handle NullableJsonNullValueInput type
      }
    })

    console.log(`✅ Push subscription removed for user ${session.user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to remove push subscription:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
