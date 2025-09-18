// app/api/field-reports/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const fieldReport = await prisma.fieldReport.findUnique({
      where: { id },
      include: {
        mission: {
          include: {
            lead: true
          }
        },
        submittedBy: true
      }
    })

    if (!fieldReport) {
      return new NextResponse('Field report not found', { status: 404 })
    }

    return NextResponse.json(fieldReport)
  } catch (error) {
    console.error('Failed to fetch field report:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(
  _request: Request, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await prisma.fieldReport.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete field report:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}