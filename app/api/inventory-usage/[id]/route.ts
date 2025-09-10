// app/api/inventory-usage/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const inventoryUsage = await prisma.inventoryUsage.findUnique({
      where: { id: params.id },
      include: {
        inventory: true,
        mission: {
          include: {
            lead: true
          }
        }
      }
    })

    if (!inventoryUsage) {
      return new NextResponse('Inventory usage not found', { status: 404 })
    }

    return NextResponse.json(inventoryUsage)
  } catch (error) {
    console.error('Failed to fetch inventory usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get usage details before deletion to restore stock
    const usage = await prisma.inventoryUsage.findUnique({
      where: { id: params.id },
      include: { inventory: true }
    })

    if (!usage) {
      return new NextResponse('Inventory usage not found', { status: 404 })
    }

    // Delete usage and restore inventory stock in transaction
    await prisma.$transaction(async (tx) => {
      // Delete usage record
      await tx.inventoryUsage.delete({
        where: { id: params.id }
      })

      // Restore inventory stock
      await tx.inventory.update({
        where: { id: usage.inventoryId },
        data: {
          currentStock: {
            increment: usage.quantity
          }
        }
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete inventory usage:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const {
      missionId,
      generalObservations,
      clientFeedback,
      issuesEncountered,
      materialsUsed,
      hoursWorked,
      beforePhotos,
      afterPhotos,
      clientSignatureUrl,
      teamLeadSignatureUrl,
      additionalNotes
    } = body

    if (!missionId || !hoursWorked) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const fieldReport = await prisma.fieldReport.create({
      data: {
        missionId,
        submittedById: session.user.id,
        generalObservations,
        clientFeedback,
        issuesEncountered,
        materialsUsed,
        hoursWorked: parseFloat(hoursWorked),
        beforePhotos: beforePhotos || [],
        afterPhotos: afterPhotos || [],
        clientSignatureUrl,
        teamLeadSignatureUrl,
        additionalNotes
      },
      include: {
        mission: {
          include: {
            lead: true
          }
        },
        submittedBy: true
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'MISSION_COMPLETED',
        title: 'Rapport de terrain soumis',
        description: `Rapport de terrain créé pour la mission ${fieldReport.mission.missionNumber}`,
        userId: session.user.id,
        leadId: fieldReport.mission.leadId,
      }
    })

    return NextResponse.json(fieldReport, { status: 201 })
  } catch (error) {
    console.error('Failed to create field report:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}