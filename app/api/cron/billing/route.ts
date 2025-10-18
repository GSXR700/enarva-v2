// app/api/cron/billing/route.ts - UPDATED WITH ADVANCE SYSTEM
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

export async function POST(request: Request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('Authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log('🔄 Starting subscription billing automation...')

    // Get all active subscriptions that are due for billing today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const subscriptionsDue = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBilling: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        lead: true
      }
    })

    console.log(`📋 Found ${subscriptionsDue.length} subscriptions due for billing`)

    let successCount = 0
    let errorCount = 0
    const results = []

    for (const subscription of subscriptionsDue) {
      try {
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
            address: subscription.lead.address || 'Facturation automatique',
            leadId: subscription.leadId,
          }
        })

        // Create the invoice with required missionId
        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber,
            amount: finalAmount,
            advanceAmount: new Decimal(0),
            remainingAmount: finalAmount,
            status: 'SENT',
            issueDate: new Date(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            missionId: mission.id,
            leadId: subscription.leadId,
            description: `Abonnement ${subscription.type} - Facturation mensuelle`,
          }
        })

        // Update subscription for next billing cycle
        const nextBillingDate = new Date(subscription.nextBilling)
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1)

        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            nextBilling: nextBillingDate,
            usedServices: 0,
            updatedAt: new Date()
          }
        })

        // Create activity log
        await prisma.activity.create({
          data: {
            type: 'SUBSCRIPTION_CREATED',
            title: 'Facture d\'abonnement générée automatiquement',
            description: `Facture ${invoiceNumber} créée pour l'abonnement ${subscription.type}`,
            userId: 'system',
            leadId: subscription.leadId,
            metadata: {
              subscriptionId: subscription.id,
              invoiceId: invoice.id,
              amount: finalAmount.toString(),
              automatedBilling: true
            }
          }
        })

        results.push({
          subscriptionId: subscription.id,
          leadName: `${subscription.lead.firstName} ${subscription.lead.lastName}`,
          invoiceNumber,
          amount: finalAmount.toString(),
          nextBilling: nextBillingDate,
          status: 'success'
        })

        successCount++
        console.log(`✅ Created invoice ${invoiceNumber} for ${subscription.lead.firstName} ${subscription.lead.lastName}`)

      } catch (error) {
        console.error(`❌ Error processing subscription ${subscription.id}:`, error)
        
        results.push({
          subscriptionId: subscription.id,
          leadName: `${subscription.lead.firstName} ${subscription.lead.lastName}`,
          error: (error as Error).message,
          status: 'error'
        })

        errorCount++
      }
    }

    // Log the overall results
    await prisma.systemLog.create({
      data: {
        type: 'INFO',
        status: errorCount === 0 ? 'SUCCESS' : 'FAILED',
        message: `Subscription billing automation completed: ${successCount} success, ${errorCount} errors`,
        metadata: {
          successCount,
          errorCount,
          totalProcessed: subscriptionsDue.length,
          results
        }
      }
    })

    console.log(`🎉 Subscription billing automation completed: ${successCount} success, ${errorCount} errors`)

    return NextResponse.json({
      success: true,
      processed: subscriptionsDue.length,
      successCount,
      errorCount,
      results
    })

  } catch (error) {
    console.error('❌ Subscription billing automation failed:', error)
    
    // Log the error
    await prisma.systemLog.create({
      data: {
        type: 'ERROR',
        status: 'FAILED',
        message: `Subscription billing automation failed: ${(error as Error).message}`,
        metadata: { error: (error as Error).toString() }
      }
    })

    return new NextResponse('Internal Server Error', { status: 500 })
  }
}