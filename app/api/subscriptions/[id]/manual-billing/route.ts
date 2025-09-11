// app/api/subscriptions/[id]/manual-billing/route.ts - FIXED VERSION
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(
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

    if (subscription.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Can only bill active subscriptions' },
        { status: 400 }
      )
    }

    // Calculate the final amount after discount
    const baseAmount = subscription.monthlyPrice
    const discountAmount = baseAmount.mul(subscription.discount).div(100)
    const finalAmount = baseAmount.sub(discountAmount)

    // Generate invoice number
    const invoiceNumber = `SUB-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // Create a mission for subscription billing (required by schema)
    const mission = await prisma.mission.create({
      data: {
        missionNumber: `BILLING-${invoiceNumber}`,
        status: 'COMPLETED',
        priority: 'NORMAL',
        type: 'RECURRING',
        scheduledDate: new Date(),
        estimatedDuration: 1,
        address: subscription.lead.address || 'Facturation manuelle',
        leadId: subscription.leadId,
      }
    })

    // Create the invoice with required missionId
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        amount: finalAmount,
        status: 'SENT',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        missionId: mission.id, // Fix: Add required missionId
        leadId: subscription.leadId,
        description: `Abonnement ${subscription.type} - Facturation manuelle`,
      }
    })

    // Update subscription for next billing cycle
    const nextBillingDate = new Date(subscription.nextBilling)
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

    await prisma.subscription.update({
      where: { id },
      data: {
        nextBilling: nextBillingDate,
        usedServices: 0,
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'SUBSCRIPTION_CREATED',
        title: 'Facture d\'abonnement générée manuellement',
        description: `Facture ${invoiceNumber} créée manuellement pour l'abonnement ${subscription.type}`,
        userId: 'manual',
        leadId: subscription.leadId,
        metadata: {
          subscriptionId: subscription.id,
          invoiceId: invoice.id,
          amount: finalAmount.toString(),
          manualBilling: true
        }
      }
    })

    return NextResponse.json({
      success: true,
      invoice,
      subscription: {
        ...subscription,
        nextBilling: nextBillingDate
      }
    })

  } catch (error) {
    console.error('Failed to process manual billing:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}