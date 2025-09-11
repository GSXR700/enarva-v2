// app/api/push/send/route.ts - SEND PUSH NOTIFICATIONS (FIXED)
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import webpush from 'web-push'

const prisma = new PrismaClient()

// Configure VAPID details
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contact@enarva.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Only admins and managers can send push notifications
    const user = session.user as any
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { 
      title, 
      body, 
      icon = '/icon-192x192.png',
      badge = '/badge-72x72.png',
      userIds = [], // Specific user IDs to send to
      roles = [], // Specific roles to send to
      broadcast = false // Send to all users
    } = await request.json()

    if (!title || !body) {
      return new NextResponse('Title and body are required', { status: 400 })
    }

    // Build user query based on targeting options
    let whereClause: any = {
      pushSubscription: { not: null }
    }

    if (!broadcast) {
      if (userIds.length > 0) {
        whereClause.id = { in: userIds }
      } else if (roles.length > 0) {
        whereClause.role = { in: roles }
      } else {
        return new NextResponse('Must specify userIds, roles, or set broadcast=true', { status: 400 })
      }
    }

    // Get users with push subscriptions
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        pushSubscription: true
      }
    })

    if (users.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users found with push subscriptions',
        sent: 0 
      })
    }

    // Send notifications
    const payload = JSON.stringify({
      title,
      body,
      icon,
      badge,
      timestamp: Date.now(),
      actions: [
        {
          action: 'open',
          title: 'Ouvrir',
          icon: '/icon-192x192.png'
        }
      ]
    })

    let successCount = 0
    let errorCount = 0
    const results = []

    for (const user of users) {
      try {
        if (user.pushSubscription) {
          await webpush.sendNotification(
            user.pushSubscription as any,
            payload
          )
          successCount++
          results.push({
            userId: user.id,
            userName: user.name,
            status: 'sent'
          })
        }
      } catch (error) {
        console.error(`Failed to send notification to user ${user.id}:`, error)
        
        // Fix: Proper error type handling
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        
        errorCount++
        results.push({
          userId: user.id,
          userName: user.name,
          status: 'failed',
          error: errorMessage // Fix: Use typed error message
        })

        // If subscription is invalid, remove it
        if (error && typeof error === 'object' && 'statusCode' in error && (error as any).statusCode === 410) {
          await prisma.user.update({
            where: { id: user.id },
            data: { pushSubscription: null as any }
          })
        }
      }
    }

    // Log the notification send
    await prisma.systemLog.create({
      data: {
        type: 'INFO',
        status: errorCount === 0 ? 'SUCCESS' : 'FAILED',
        message: `Push notification sent: ${successCount} success, ${errorCount} errors`,
        metadata: {
          title,
          body,
          successCount,
          errorCount,
          totalUsers: users.length,
          results
        }
      }
    })

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: errorCount,
      total: users.length,
      results
    })

  } catch (error) {
    console.error('Failed to send push notifications:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}