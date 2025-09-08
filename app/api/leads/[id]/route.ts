// app/api/leads/[id]/route.ts - FIXED ROUTE CONTEXT
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateLeadInput } from '@/lib/validation';
import { withErrorHandler } from '@/lib/error-handler';
import { LeadStatus } from '@prisma/client';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const lead = await leadService.getLeadById(context.params.id, {
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
      session.user.role !== 'ADMIN' && 
      session.user.role !== 'MANAGER' && 
      lead.assignedToId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    return NextResponse.json(lead);
  });
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const leadId = context.params.id;
    
    const existingLead = await leadService.getLeadById(leadId);
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    const canEdit = (
      session.user.role === 'ADMIN' ||
      session.user.role === 'MANAGER' ||
      (session.user.role === 'AGENT' && existingLead.assignedToId === session.user.id)
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

    try {
      const updatedLead = await leadService.updateLead(leadId, updateData);

      if (body.status && body.status !== existingLead.status) {
        await leadService.logActivity({
          type: 'LEAD_STATUS_CHANGED',
          title: 'Statut modifié',
          description: `Statut changé de ${existingLead.status} vers ${body.status}`,
          leadId: leadId,
          userId: session.user.id,
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
            ? 'Lead assigné à un nouveau responsable'
            : 'Assignation du lead supprimée',
          leadId: leadId,
          userId: session.user.id,
          metadata: {
            oldAssignedToId: existingLead.assignedToId,
            newAssignedToId: body.assignedToId
          }
        });
      }

      if (body.status && ['QUOTE_ACCEPTED', 'COMPLETED', 'CANCELLED'].includes(body.status)) {
        if (process.env.PUSHER_APP_ID) {
          const Pusher = require('pusher');
          const pusher = new Pusher({
            appId: process.env.PUSHER_APP_ID,
            key: process.env.PUSHER_KEY,
            secret: process.env.PUSHER_SECRET,
            cluster: process.env.PUSHER_CLUSTER,
            useTLS: true
          });

          await pusher.trigger('leads-channel', 'lead-status-changed', {
            id: updatedLead.id,
            firstName: updatedLead.firstName,
            lastName: updatedLead.lastName,
            status: updatedLead.status,
            assignedToId: updatedLead.assignedToId
          });
        }
      }

      return NextResponse.json(updatedLead);
    } catch (error) {
      console.error('Error updating lead:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du lead' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  return withErrorHandler(async () => {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const leadId = context.params.id;
    
    const existingLead = await leadService.getLeadById(leadId);
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    try {
      const relatedData = await leadService.getLeadRelations(leadId);
      
      if (relatedData.quotes.length > 0 || relatedData.missions.length > 0) {
        return NextResponse.json(
          { 
            error: 'Impossible de supprimer ce lead',
            details: 'Le lead a des devis ou missions associés. Changez son statut vers "Annulé" à la place.'
          },
          { status: 400 }
        );
      }

      await leadService.deleteLead(leadId);

      await leadService.logActivity({
        type: 'LEAD_DELETED',
        title: 'Lead supprimé',
        description: `Lead ${existingLead.firstName} ${existingLead.lastName} supprimé`,
        userId: session.user.id,
        metadata: {
          deletedLead: {
            id: existingLead.id,
            firstName: existingLead.firstName,
            lastName: existingLead.lastName,
            company: existingLead.company
          }
        }
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting lead:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du lead' },
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