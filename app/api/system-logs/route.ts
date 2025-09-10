// app/api/system-logs/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const systemLogs = await prisma.systemLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 1000 // Limit to prevent performance issues
    })
    
    return NextResponse.json(systemLogs)
  } catch (error) {
    console.error('Failed to fetch system logs:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, status, message, metadata } = body

    if (!type || !status || !message) {
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

    return NextResponse.json(systemLog, { status: 201 })
  } catch (error) {
    console.error('Failed to create system log:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}