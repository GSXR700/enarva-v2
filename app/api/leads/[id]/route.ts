// app/api/leads/[id]/route.ts - COMPLETE CORRECTED VERSION WITH calculateLeadScore
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateCompleteLeadInput } from '@/lib/validation';
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
    console.log('Lead update request body:', body);

    // Clean and transform the data before validation
    const cleanedData = cleanLeadData(body);
    console.log('Cleaned data:', cleanedData);

    // Check if it's a partial update (status, assignment, or score only)
    const isPartialUpdate = Object.keys(cleanedData).length <= 3 && (
      cleanedData.status || 
      cleanedData.assignedToId !== undefined ||
      cleanedData.score !== undefined
    );
    
    let updateData = cleanedData;

    // Only validate for full updates, not partial ones
    if (!isPartialUpdate) {
      const validation = validateCompleteLeadInput(cleanedData, false);
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
      updateData = validation.data;
    }

    // Calculate score for full updates or when score-affecting fields change
    if (!isPartialUpdate || body.budgetRange || body.urgencyLevel || body.estimatedSurface) {
      const mergedData = { ...existingLead, ...updateData };
      updateData.score = calculateLeadScore(mergedData);
    }

    // Store previous values for logging
    const previousStatus = existingLead.status;
    const previousAssignedToId = existingLead.assignedToId;

    // Update the lead
    const updatedLead = await leadService.updateLead(leadId, updateData);

    // Log status changes (only if status actually changed)
    if (body.status && body.status !== previousStatus) {
      try {
        await leadService.logActivity({
          type: 'LEAD_CREATED',
          title: 'Statut modifié',
          description: `Statut changé de ${previousStatus} vers ${body.status}`,
          leadId: leadId,
          userId: user.id,
          metadata: {
            oldStatus: previousStatus,
            newStatus: body.status
          }
        });
      } catch (activityError) {
        console.warn('Failed to log status change activity:', activityError);
        // Continue without failing the update
      }
    }

    // Log assignment changes (only if assignment actually changed)
    if (body.assignedToId !== undefined && body.assignedToId !== previousAssignedToId) {
      try {
        await leadService.logActivity({
          type: 'LEAD_CREATED',
          title: 'Assignation modifiée',
          description: body.assignedToId 
            ? `Lead assigné à ${body.assignedToId}`
            : 'Lead non assigné',
          leadId: leadId,
          userId: user.id,
          metadata: {
            oldAssignee: previousAssignedToId,
            newAssignee: body.assignedToId
          }
        });
      } catch (activityError) {
        console.warn('Failed to log assignment change activity:', activityError);
        // Continue without failing the update
      }
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

    const { id: leadId } = await params;

    const existingLead = await leadService.getLeadById(leadId);
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    await leadService.deleteLead(leadId);

    try {
      await leadService.logActivity({
        type: 'LEAD_CREATED',
        title: 'Lead supprimé',
        description: `Lead ${existingLead.firstName} ${existingLead.lastName} supprimé`,
        leadId: leadId,
        userId: user.id,
        metadata: {
          deletedLead: {
            firstName: existingLead.firstName,
            lastName: existingLead.lastName,
            phone: existingLead.phone
          }
        }
      });
    } catch (activityError) {
      console.warn('Failed to log deletion activity:', activityError);
      // Continue - deletion was successful
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete lead:', error);
    return errorHandler(error);
  }
}

/**
 * Clean and transform lead data from the request body
 * @param data Raw data from request body
 * @returns Cleaned and transformed data
 */
function cleanLeadData(data: any) {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip empty strings and convert them to undefined
    if (value === '' || value === null) {
      // For specific fields that should be null when empty
      if (['urgencyLevel', 'propertyType', 'assignedToId'].includes(key)) {
        if (value === null || value === '') {
          cleaned[key] = null;
        }
      }
      continue;
    }
    
    // Convert string numbers to actual numbers
    if (key === 'estimatedSurface' && typeof value === 'string' && value !== '') {
      const num = parseInt(value, 10);
      if (!isNaN(num) && num > 0) {
        cleaned[key] = num;
      }
      continue;
    }
    
    // Convert string numbers to actual numbers for score
    if (key === 'score' && typeof value === 'string' && value !== '') {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        cleaned[key] = num;
      }
      continue;
    }
    
    // Handle boolean fields
    if (typeof value === 'boolean') {
      cleaned[key] = value;
      continue;
    }
    
    // Handle string fields - trim whitespace
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed !== '') {
        cleaned[key] = trimmed;
      }
      continue;
    }
    
    // Keep other types as-is
    cleaned[key] = value;
  }
  
  return cleaned;
}

/**
 * Calculate lead score based on various factors
 * @param leadData The lead data to calculate score for
 * @returns Score from 0-100
 */
function calculateLeadScore(leadData: any): number {
  let score = 0;
  
  // Base score for having a lead
  score += 10;
  
  // Budget range scoring (40 points max)
  if (leadData.budgetRange) {
    const budgetScores: Record<string, number> = {
      'MOINS_1000': 5,
      'ENTRE_1000_5000': 15,
      'ENTRE_5000_15000': 25,
      'ENTRE_15000_30000': 35,
      'ENTRE_30000_50000': 40,
      'PLUS_50000': 40
    };
    score += budgetScores[leadData.budgetRange] || 0;
  }
  
  // Urgency level scoring (25 points max)
  if (leadData.urgencyLevel) {
    const urgencyScores: Record<string, number> = {
      'IMMEDIATE': 25,
      'HIGH_URGENT': 20,
      'URGENT': 15,
      'NORMAL': 10,
      'LOW': 5
    };
    score += urgencyScores[leadData.urgencyLevel] || 0;
  }
  
  // Surface area scoring (20 points max)
  if (leadData.estimatedSurface) {
    const surface = parseInt(leadData.estimatedSurface);
    if (surface >= 500) score += 20;
    else if (surface >= 200) score += 15;
    else if (surface >= 100) score += 10;
    else score += 5;
  }
  
  // Lead type scoring (10 points max)
  if (leadData.leadType) {
    const typeScores: Record<string, number> = {
      'PROFESSIONNEL': 10,
      'PUBLIC': 8,
      'SYNDIC': 7,
      'PARTICULIER': 5,
      'NGO': 3,
      'OTHER': 2
    };
    score += typeScores[leadData.leadType] || 0;
  }
  
  // Contact completeness bonus (5 points max)
  if (leadData.email) score += 2;
  if (leadData.address) score += 2;
  if (leadData.company && leadData.leadType === 'PROFESSIONNEL') score += 1;
  
  // Frequency bonus (for recurring business potential)
  if (leadData.frequency && leadData.frequency !== 'PONCTUEL') {
    score += 5;
  }
  
  // Property type bonus (certain types are more valuable)
  if (leadData.propertyType) {
    const propertyScores: Record<string, number> = {
      'HOTEL_LUXURY': 5,
      'COMMERCIAL': 4,
      'OFFICE': 4,
      'HOTEL_STANDARD': 3,
      'RESIDENCE_B2B': 3,
      'BUILDING': 3,
      'RESTAURANT': 2,
      'WAREHOUSE': 2,
      'VILLA_LARGE': 2,
      'APARTMENT_LARGE': 1,
      'APARTMENT_MULTI': 1
    };
    score += propertyScores[leadData.propertyType] || 0;
  }
  
  // Ensure score doesn't exceed 100
  return Math.min(score, 100);
}