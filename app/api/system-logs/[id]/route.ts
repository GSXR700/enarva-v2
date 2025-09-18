// app/api/system-logs/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const systemLog = await prisma.systemLog.findUnique({
      where: { id }
    })

    if (!systemLog) {
      return new NextResponse('System log not found', { status: 404 })
    }

    return NextResponse.json(systemLog)
  } catch (error) {
    console.error('Failed to fetch system log:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.systemLog.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete system log:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}