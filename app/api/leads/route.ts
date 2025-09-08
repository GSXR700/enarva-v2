// app/api/leads/route.ts - FIXED WITH TYPE ASSERTIONS
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateLeadInput } from '@/lib/validation';
import { withErrorHandler } from '@/lib/error-handler';
import { applyRateLimit } from '@/lib/rate-limit';
import { LeadStatus, Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search');
    const assignedToId = searchParams.get('assignedToId');

    const where: Prisma.LeadWhereInput = {};

    if (statusParam && statusParam !== 'ALL') {
      where.status = statusParam as LeadStatus;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (session.user.role === 'AGENT' || session.user.role === 'TECHNICIAN') {
      where.assignedToId = session.user.id;
    }

    const skip = (page - 1) * limit;

    const [leads, total] = await Promise.all([
      leadService.getLeads({
        where,
        skip,
        take: limit,
        include: {
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      leadService.countLeads({ where })
    ]);

    return NextResponse.json({
      leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  });
}

export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const rateLimitResult = await applyRateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429 }
      );
    }

    if (!['ADMIN', 'MANAGER', 'AGENT'].includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Permissions insuffisantes' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validation = validateLeadInput(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: validation.error.errors.map((e: any) => e.message)
        },
        { status: 400 }
      );
    }

    const leadData = validation.data;

    if (!leadData.assignedToId && session.user.role === 'AGENT') {
      leadData.assignedToId = session.user.id;
    }

    const score = calculateLeadScore(leadData);

    try {
      const createData = {
        ...leadData,
        score,
        originalMessage: leadData.originalMessage || '',
      };

      const newLead = await leadService.createLead(createData, session.user.id);

      if (process.env.PUSHER_APP_ID) {
        const Pusher = require('pusher');
        const pusher = new Pusher({
          appId: process.env.PUSHER_APP_ID,
          key: process.env.PUSHER_KEY,
          secret: process.env.PUSHER_SECRET,
          cluster: process.env.PUSHER_CLUSTER,
          useTLS: true
        });

        await pusher.trigger('leads-channel', 'new-lead', {
          id: newLead.id,
          firstName: newLead.firstName,
          lastName: newLead.lastName,
          score: newLead.score,
          status: newLead.status
        });
      }

      return NextResponse.json(newLead, { status: 201 });
    } catch (error) {
      console.error('Error creating lead:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la création du lead' },
        { status: 500 }
      );
    }
  });
}

function calculateLeadScore(leadData: any): number {
  let score = 0;

  if (leadData.firstName && leadData.lastName && leadData.phone) {
    score += 20;
  }

  if (leadData.email) {
    score += 10;
  }

  if (leadData.leadType === 'PROFESSIONNEL' && leadData.company) {
    score += 15;
    if (leadData.iceNumber) score += 5;
  }

  if (leadData.budgetRange) {
    const budgetScore: Record<string, number> = {
      'MOINS_1000': 5,
      'ENTRE_1000_5000': 10,
      'ENTRE_5000_10000': 15,
      'ENTRE_10000_25000': 20,
      'PLUS_25000': 25
    };
    score += budgetScore[leadData.budgetRange] || 0;
  }

  const urgencyScore: Record<string, number> = {
    'LOW': 5,
    'NORMAL': 10,
    'URGENT': 15,
    'HIGH_URGENT': 20,
    'IMMEDIATE': 25
  };
  score += urgencyScore[leadData.urgencyLevel] || 10;

  if (leadData.estimatedSurface && leadData.estimatedSurface > 0) {
    score += 10;
  }

  if (leadData.propertyType) {
    score += 5;
  }

  if (leadData.originalMessage && leadData.originalMessage.length > 50) {
    score += 10;
  }

  return Math.min(score, 100);
}