// app/api/leads/route.ts - COMPLETE ERROR-FREE VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateLeadInput } from '@/lib/validation';
import { errorHandler } from '@/lib/error-handler';
import { applyRateLimit } from '@/lib/rate-limit';
import { LeadStatus, Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
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
  } catch (error) {
    return errorHandler(error);
  }
}

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
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

    const score = calculateLeadScore(validation.data);
    const leadData = {
      ...validation.data,
      score,
      originalMessage: validation.data.originalMessage || 'Lead créé depuis l\'interface',
      createdById: session.user.id
    };

    // Remove createdById from leadData as it's not part of Prisma schema
    const { createdById, ...prismaLeadData } = leadData;

    const newLead = await leadService.createLead(prismaLeadData, session.user.id);

    // Optional: Trigger Pusher notification if configured
    if (process.env.PUSHER_APP_ID) {
      try {
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
      } catch (pusherError) {
        console.warn('Pusher notification failed:', pusherError);
        // Don't fail the request if Pusher fails
      }
    }

    return NextResponse.json(newLead, { status: 201 });
  } catch (error) {
    console.error('Failed to create lead:', error);
    return errorHandler(error);
  }
}

function calculateLeadScore(leadData: any): number {
  let score = 0;
  
  // Base score for having essential information
  if (leadData.firstName && leadData.lastName && leadData.phone) {
    score += 20;
  }

  // Email bonus
  if (leadData.email) {
    score += 10;
  }

  // Professional lead bonuses
  if (leadData.leadType === 'PROFESSIONNEL' && leadData.company) {
    score += 15;
    if (leadData.iceNumber) score += 5;
  }

  // Budget range scoring
  if (leadData.budgetRange) {
    const budgetScores = {
      'MOINS_5000': 20,
      'ENTRE_5000_15000': 40,
      'ENTRE_15000_30000': 60,
      'ENTRE_30000_50000': 80,
      'PLUS_50000': 100
    };
    score += budgetScores[leadData.budgetRange as keyof typeof budgetScores] || 0;
  }
  
  // Urgency level scoring
  if (leadData.urgencyLevel) {
    const urgencyScores = {
      'IMMEDIATE': 30,
      'THIS_WEEK': 25,
      'THIS_MONTH': 20,
      'NEXT_MONTH': 15,
      'NO_URGENCY': 5
    };
    score += urgencyScores[leadData.urgencyLevel as keyof typeof urgencyScores] || 10;
  }
  
  // Surface area scoring
  if (leadData.estimatedSurface && leadData.estimatedSurface > 0) {
    const surface = parseInt(leadData.estimatedSurface);
    if (surface >= 500) score += 30;
    else if (surface >= 200) score += 20;
    else if (surface >= 100) score += 15;
    else score += 10;
  }

  // Property type bonus
  if (leadData.propertyType) {
    score += 5;
  }

  // Detailed message bonus
  if (leadData.originalMessage && leadData.originalMessage.length > 50) {
    score += 10;
  }
  
  return Math.min(score, 100); // Cap at 100
}