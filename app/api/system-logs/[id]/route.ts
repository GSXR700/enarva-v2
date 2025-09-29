// app/api/system-logs/[id]/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'  // CHANGED: Use singleton instead of new PrismaClient()

export async function GET(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log(`🔵 Fetching system log: ${id}`)
    
    const systemLog = await prisma.systemLog.findUnique({
      where: { id }
    })

    if (!systemLog) {
      console.log(`❌ System log not found: ${id}`)
      return new NextResponse('System log not found', { status: 404 })
    }

    console.log(`✅ System log found: ${id}`)
    return NextResponse.json(systemLog)
  } catch (error) {
    console.error('❌ Failed to fetch system log:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    console.log(`🔵 Deleting system log: ${id}`)
    
    await prisma.systemLog.delete({
      where: { id }
    })

    console.log(`✅ System log deleted: ${id}`)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Failed to delete system log:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}