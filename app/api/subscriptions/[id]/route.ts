// app/api/subscriptions/[id]/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        lead: true
      }
    })

    if (!subscription) {
      return new NextResponse('Subscription not found', { status: 404 })
    }

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Failed to fetch subscription:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      type,
      status,
      monthlyPrice,
      discount,
      nextBilling,
      includedServices,
      usedServices
    } = body

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(status && { status }),
        ...(monthlyPrice && { monthlyPrice: new Decimal(monthlyPrice) }),
        ...(discount !== undefined && { discount: new Decimal(discount) }),
        ...(nextBilling && { nextBilling: new Date(nextBilling) }),
        ...(includedServices && { includedServices: parseInt(includedServices) }),
        ...(usedServices !== undefined && { usedServices: parseInt(usedServices) })
      },
      include: {
        lead: true
      }
    })

    return NextResponse.json(subscription)
  } catch (error) {
    console.error('Failed to update subscription:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.subscription.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete subscription:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}