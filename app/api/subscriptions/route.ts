// app/api/subscriptions/route.ts - FIXED BASED ON ACTUAL PRISMA SCHEMA
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');

    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    
    if (leadId) {
      whereClause.leadId = leadId;
    }

    const subscriptions = await prisma.subscription.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            address: true,
            leadType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(subscriptions);
  } catch (error) {
    console.error('Failed to fetch subscriptions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    console.log('📝 Creating subscription with data:', body);

    const {
      leadId,
      type,
      monthlyPrice,
      discount,
      nextBilling,
      includedServices,
      status
    } = body;

    if (!leadId || !type || !monthlyPrice || !nextBilling || includedServices === undefined) {
      return new NextResponse('Missing required fields: leadId, type, monthlyPrice, nextBilling, includedServices', { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        status: true
      }
    });

    if (!lead) {
      console.error('❌ Lead not found:', leadId);
      return new NextResponse('Lead not found', { status: 404 });
    }

    console.log('✅ Lead found:', lead);

    const subscription = await prisma.subscription.create({
      data: {
        leadId,
        type,
        status: status || 'ACTIVE',
        monthlyPrice: new Decimal(monthlyPrice),
        discount: discount ? new Decimal(discount) : new Decimal(0),
        nextBilling: new Date(nextBilling),
        includedServices: parseInt(includedServices),
        usedServices: 0
      },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true,
            leadType: true
          }
        }
      }
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'UNDER_CONTRACT',
        updatedAt: new Date()
      }
    });

    await prisma.activity.create({
      data: {
        type: 'SUBSCRIPTION_CREATED',
        title: 'Nouvel abonnement créé',
        description: `Abonnement ${type} créé pour ${lead.firstName} ${lead.lastName} - ${monthlyPrice}€/mois`,
        userId: session.user.id,
        leadId: leadId,
        metadata: {
          subscriptionId: subscription.id,
          type,
          monthlyPrice,
          includedServices
        }
      }
    });

    console.log('✅ Subscription created successfully:', subscription.id);

    return NextResponse.json(subscription, { status: 201 });

  } catch (error) {
    console.error('❌ Failed to create subscription:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return new NextResponse('Invalid lead ID - Foreign key constraint failed', { status: 400 });
      }
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}