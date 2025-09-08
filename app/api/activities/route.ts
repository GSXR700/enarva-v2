// app/api/activities/route.ts - COMPLETE CORRECTED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const leadId = searchParams.get('leadId');
    const type = searchParams.get('type');

    let where: any = {};

    // Filter by user role
    if (user.role === 'AGENT' || user.role === 'TECHNICIAN' || user.role === 'TEAM_LEADER') {
      where.userId = user.id;
    }

    // Filter by leadId if provided
    if (leadId) {
      where.leadId = leadId;
    }

    // Filter by activity type if provided
    if (type) {
      where.type = type;
    }

    const activities = await prisma.activity.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    const body = await request.json();
    const { type, title, description, leadId, metadata } = body;

    if (!type || !title || !description) {
      return new NextResponse('Missing required fields: type, title, description', { status: 400 });
    }

    // Validate activity type
    const validTypes = [
      'LEAD_CREATED', 'LEAD_QUALIFIED', 'QUOTE_GENERATED', 'QUOTE_SENT',
      'MISSION_SCHEDULED', 'MISSION_STARTED', 'MISSION_COMPLETED',
      'PAYMENT_RECEIVED', 'SUBSCRIPTION_CREATED', 'QUALITY_ISSUE', 'CLIENT_FEEDBACK'
    ];

    if (!validTypes.includes(type)) {
      return new NextResponse('Invalid activity type', { status: 400 });
    }

    // If leadId is provided, verify it exists and user has access
    if (leadId) {
      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true, assignedToId: true }
      });

      if (!lead) {
        return new NextResponse('Lead not found', { status: 404 });
      }

      // Check permissions
      if (user.role !== 'ADMIN' && user.role !== 'MANAGER' && lead.assignedToId !== user.id) {
        return new NextResponse('Access denied to this lead', { status: 403 });
      }
    }

    const activity = await prisma.activity.create({
      data: {
        type,
        title,
        description,
        leadId: leadId || null,
        userId: user.id,
        metadata: metadata || {},
        createdAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json(activity, { status: 201 });
  } catch (error) {
    console.error('Failed to create activity:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}