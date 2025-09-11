// app/api/subscriptions/[id]/billing-preview/route.ts - BILLING PREVIEW
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Calculate billing preview
    const baseAmount = subscription.monthlyPrice
    const discountAmount = baseAmount.mul(subscription.discount).div(100)
    const finalAmount = baseAmount.sub(discountAmount)

    const preview = {
      subscriptionId: subscription.id,
      leadName: `${subscription.lead.firstName} ${subscription.lead.lastName}`,
      subscriptionType: subscription.type,
      baseAmount: baseAmount.toString(),
      discount: subscription.discount.toString(),
      discountAmount: discountAmount.toString(),
      finalAmount: finalAmount.toString(),
      nextBilling: subscription.nextBilling,
      includedServices: subscription.includedServices,
      usedServices: subscription.usedServices,
      remainingServices: subscription.includedServices - subscription.usedServices
    }

    return NextResponse.json(preview)

  } catch (error) {
    console.error('Failed to generate billing preview:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}