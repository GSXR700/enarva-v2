// app/api/system-logs/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'  // CHANGED: Use singleton instead of new PrismaClient()

export async function GET() {
  try {
    console.log('🔵 Fetching system logs...')
    
    const systemLogs = await prisma.systemLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000
    })
    
    console.log(`✅ Successfully fetched ${systemLogs.length} system logs`)
    return NextResponse.json(systemLogs)
  } catch (error) {
    console.error('❌ Failed to fetch system logs:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, status, message, metadata } = body

    console.log('🔵 Creating system log:', { type, status, message })

    if (!type || !status || !message) {
      console.log('❌ Missing required fields')
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const systemLog = await prisma.systemLog.create({
      data: {
        type,
        status,
        message,
        metadata: metadata || null
      }
    })

    console.log(`✅ System log created successfully: ${systemLog.id}`)
    return NextResponse.json(systemLog, { status: 201 })
  } catch (error) {
    console.error('❌ Failed to create system log:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}