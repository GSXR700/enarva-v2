// app/api/system-logs/cleanup/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'  // CHANGED: Use singleton instead of new PrismaClient()

export async function DELETE() {
  try {
    console.log('🔵 Starting cleanup of old system logs...')
    
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const result = await prisma.systemLog.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    })

    console.log(`✅ Cleanup complete: ${result.count} logs deleted`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount: result.count 
    })
  } catch (error) {
    console.error('❌ Failed to cleanup system logs:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}