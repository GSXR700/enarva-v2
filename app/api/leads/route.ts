// app/api/leads/route.ts - COMPLETE CORRECTED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateCompleteLeadInput } from '@/lib/validations';
import { errorHandler } from '@/lib/error-handler';
import { applyRateLimit } from '@/lib/rate-limit';
import { LeadStatus, Prisma } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
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

    if (user.role === 'AGENT' || user.role === 'TECHNICIAN') {
      where.assignedToId = user.id;
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const rateLimitResult = await applyRateLimit(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes. Veuillez réessayer plus tard.' },
        { status: 429 }
      );
    }

    if (!['ADMIN', 'MANAGER', 'AGENT'].includes(user.role)) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Lead creation request body:', body);

    // Use strict validation for creation
    const validation = validateCompleteLeadInput(body, true);
    
    if (!validation.success) {
      console.error('Validation errors:', validation.error.errors);
      return NextResponse.json(
        { 
          error: 'Données invalides', 
          details: validation.error.errors.map((e: any) => e.message)
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Ensure all required fields are present with proper types
    if (!validatedData.firstName || !validatedData.lastName || !validatedData.phone || !validatedData.channel) {
      return NextResponse.json(
        { error: 'Champs requis manquants: firstName, lastName, phone, channel' },
        { status: 400 }
      );
    }

    const score = calculateLeadScore(validatedData);
    
    // Create leadData with guaranteed required fields
    const leadData: Prisma.LeadCreateInput = {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      phone: validatedData.phone,
      channel: validatedData.channel,
      originalMessage: validatedData.originalMessage || 'Lead créé depuis l\'interface',
      score,
      status: validatedData.status || 'NEW',
      leadType: validatedData.leadType || 'PARTICULIER',
      accessibility: validatedData.accessibility || 'EASY',
      frequency: validatedData.frequency || 'PONCTUEL',
      contractType: validatedData.contractType || 'INTERVENTION_UNIQUE',
      needsProducts: validatedData.needsProducts || false,
      needsEquipment: validatedData.needsEquipment || false,
      providedBy: validatedData.providedBy || 'ENARVA',
      hasReferrer: validatedData.hasReferrer || false,
      enarvaRole: validatedData.enarvaRole || 'PRESTATAIRE_PRINCIPAL',
      // Optional fields
      ...(validatedData.email && { email: validatedData.email }),
      ...(validatedData.address && { address: validatedData.address }),
      ...(validatedData.gpsLocation && { gpsLocation: validatedData.gpsLocation }),
      ...(validatedData.company && { company: validatedData.company }),
      ...(validatedData.iceNumber && { iceNumber: validatedData.iceNumber }),
      ...(validatedData.activitySector && { activitySector: validatedData.activitySector }),
      ...(validatedData.contactPosition && { contactPosition: validatedData.contactPosition }),
      ...(validatedData.department && { department: validatedData.department }),
      ...(validatedData.propertyType && { propertyType: validatedData.propertyType }),
      ...(validatedData.estimatedSurface && { estimatedSurface: validatedData.estimatedSurface }),
      ...(validatedData.urgencyLevel && { urgencyLevel: validatedData.urgencyLevel }),
      ...(validatedData.budgetRange && { budgetRange: validatedData.budgetRange }),
      ...(validatedData.source && { source: validatedData.source }),
      ...(validatedData.referrerContact && { referrerContact: validatedData.referrerContact }),
      ...(validatedData.materials && { materials: validatedData.materials }),
      ...(validatedData.assignedToId && { 
        assignedTo: { connect: { id: validatedData.assignedToId } } 
      }),
    };

    const newLead = await leadService.createLead(leadData, user.id);

    // Optional: Trigger Pusher notification if configured
    if (process.env.PUSHER_APP_ID) {
      try {
        const Pusher = require('pusher');
        const pusher = new Pusher({
          appId: process.env.PUSHER_APP_ID,
          key: process.env.NEXT_PUBLIC_PUSHER_KEY,
          secret: process.env.PUSHER_SECRET,
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
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
    const budgetScores: Record<string, number> = {
      'MOINS_5000': 20,
      'ENTRE_5000_15000': 40,
      'ENTRE_15000_30000': 60,
      'ENTRE_30000_50000': 80,
      'PLUS_50000': 100
    };
    score += budgetScores[leadData.budgetRange] || 0;
  }
  
  // Urgency level scoring
  if (leadData.urgencyLevel) {
    const urgencyScores: Record<string, number> = {
      'IMMEDIATE': 30,
      'HIGH_URGENT': 25,
      'URGENT': 20,
      'NORMAL': 15,
      'LOW': 5
    };
    score += urgencyScores[leadData.urgencyLevel] || 10;
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