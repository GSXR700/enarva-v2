// app/api/subscriptions/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        lead: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      leadId,
      type,
      status,
      monthlyPrice,
      discount,
      nextBilling,
      includedServices,
      usedServices
    } = body

    if (!leadId || !type || !monthlyPrice || !nextBilling || !includedServices) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const subscription = await prisma.subscription.create({
      data: {
        leadId,
        type,
        status: status || 'ACTIVE',
        monthlyPrice: new Decimal(monthlyPrice),
        discount: new Decimal(discount || 0),
        nextBilling: new Date(nextBilling),
        includedServices: parseInt(includedServices),
        usedServices: parseInt(usedServices || 0)
      },
      include: {
        lead: true
      }
    })

    return NextResponse.json(subscription, { status: 201 })
  } catch (error) {
    console.error('Failed to create subscription:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}