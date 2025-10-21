// app/api/push/subscribe/route.ts - PUSH SUBSCRIPTION API (FIXED)
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

    const { subscription } = await request.json()

    if (!subscription) {
      return new NextResponse('Subscription data required', { status: 400 })
    }

    // FIX: Check if user exists before attempting update
    const userExists = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true }
    })

    if (!userExists) {
      console.error(`❌ User not found in database: ${session.user.id}`)
      return new NextResponse('User not found in database. Please log out and log in again.', { status: 404 })
    }

    // Save subscription to user
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        pushSubscription: subscription
      }
    })

    console.log(`✅ Push subscription saved for user ${session.user.id}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save push subscription:', error)
    
    // Provide more helpful error messages
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any
      if (prismaError.code === 'P2025') {
        return new NextResponse('User not found. Please log out and log in again.', { status: 404 })
      }
    }
    
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}