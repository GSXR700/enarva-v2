// app/api/subscriptions/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient()

// GET /api/subscriptions - Fetch all subscriptions with lead details
export async function GET() {
  try {
    const subscriptions = await prisma.subscription.findMany({
      include: {
        lead: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(subscriptions)
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/subscriptions - Create a new subscription
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { leadId, type, monthlyPrice, includedServices, discount } = body;

        if (!leadId || !type || !monthlyPrice || !includedServices) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        const newSubscription = await prisma.subscription.create({
            data: {
                leadId,
                type,
                monthlyPrice: new Decimal(monthlyPrice),
                includedServices: parseInt(includedServices),
                discount: new Decimal(discount || 0),
                nextBilling: nextBillingDate,
                status: 'ACTIVE',
            },
        });

        return NextResponse.json(newSubscription, { status: 201 });

    } catch (error: any) {
         if (error.code === 'P2002' && error.meta?.target?.includes('leadId')) {
             return new NextResponse('This lead already has an active subscription.', { status: 409 });
        }
        console.error('Failed to create subscription:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}