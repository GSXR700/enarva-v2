// app/api/leads/[id]/route.ts - COMPLETE NEXT.JS 15 FIX
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateLeadInput } from '@/lib/validation';
import { errorHandler } from '@/lib/error-handler';
import { LeadStatus } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // ✅ Await params for Next.js 15
    const { id: leadId } = await params;

    const lead = await leadService.getLeadById(leadId, {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: {
            select: {
              name: true,
              role: true
            }
          }
        }
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    if (
      user.role !== 'ADMIN' && 
      user.role !== 'MANAGER' && 
      lead.assignedToId !== user.id
    ) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    return errorHandler(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // ✅ Await params for Next.js 15
    const { id: leadId } = await params;
    
    const existingLead = await leadService.getLeadById(leadId);
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    const canEdit = (
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      (user.role === 'AGENT' && existingLead.assignedToId === user.id)
    );

    if (!canEdit) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const body = await request.json();
    const isPartialUpdate = Object.keys(body).length <= 3;
    
    let updateData = body;

    if (!isPartialUpdate) {
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
      updateData = validation.data;
    }

    if (!isPartialUpdate || body.budgetRange || body.urgencyLevel || body.estimatedSurface) {
      const mergedData = { ...existingLead, ...updateData };
      updateData.score = calculateLeadScore(mergedData);
    }

    const updatedLead = await leadService.updateLead(leadId, updateData);

    if (body.status && body.status !== existingLead.status) {
      await leadService.logActivity({
        type: 'LEAD_STATUS_CHANGED',
        title: 'Statut modifié',
        description: `Statut changé de ${existingLead.status} vers ${body.status}`,
        leadId: leadId,
        userId: user.id,
        metadata: {
          oldStatus: existingLead.status,
          newStatus: body.status
        }
      });
    }

    if (body.assignedToId !== undefined && body.assignedToId !== existingLead.assignedToId) {
      await leadService.logActivity({
        type: 'LEAD_ASSIGNED',
        title: 'Assignation modifiée',
        description: body.assignedToId 
          ? `Lead assigné à ${body.assignedToId}`
          : 'Lead non assigné',
        leadId: leadId,
        userId: user.id,
        metadata: {
          oldAssignee: existingLead.assignedToId,
          newAssignee: body.assignedToId
        }
      });
    }

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Failed to update lead:', error);
    return errorHandler(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    // ✅ Await params for Next.js 15
    const { id: leadId } = await params;

    const existingLead = await leadService.getLeadById(leadId);
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    await leadService.deleteLead(leadId);

    await leadService.logActivity({
      type: 'LEAD_DELETED',
      title: 'Lead supprimé',
      description: `Lead ${existingLead.firstName} ${existingLead.lastName} supprimé`,
      leadId: leadId,
      userId: session.user.id,
      metadata: {
        deletedLead: {
          firstName: existingLead.firstName,
          lastName: existingLead.lastName,
          phone: existingLead.phone
        }
      }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete lead:', error);
    return errorHandler(error);
  }
}

// Helper function for calculating lead score
function calculateLeadScore(leadData: any): number {
  let score = 0;
  
  // Base score
  score += 10;
  
  // Budget range scoring
  if (leadData.budgetRange) {
    const budgetRanges = {
      'MOINS_5000': 20,
      'ENTRE_5000_15000': 40,
      'ENTRE_15000_30000': 60,
      'ENTRE_30000_50000': 80,
      'PLUS_50000': 100
    };
    score += budgetRanges[leadData.budgetRange as keyof typeof budgetRanges] || 0;
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
    score += urgencyScores[leadData.urgencyLevel as keyof typeof urgencyScores] || 0;
  }
  
  // Surface area scoring
  if (leadData.estimatedSurface) {
    const surface = parseInt(leadData.estimatedSurface);
    if (surface >= 500) score += 30;
    else if (surface >= 200) score += 20;
    else if (surface >= 100) score += 15;
    else score += 10;
  }
  
  return Math.min(score, 100); // Cap at 100
}