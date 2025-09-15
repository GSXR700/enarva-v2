// app/api/leads/[id]/route.ts - UPDATED WITH ENHANCED VALIDATION AND FIXES
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateCompleteLeadInput, cleanLeadData } from '@/lib/validation';
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
      // For updates, we need to merge with existing data to validate properly
      const mergedDataForValidation = { ...existingLead, ...cleanedData };
      
      const validation = validateCompleteLeadInput(mergedDataForValidation, false);
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
      // Keep only the fields being updated, not the merged data
      updateData = cleanedData;
    }

    // Calculate score for full updates or when score-affecting fields change
    if (!isPartialUpdate || body.budgetRange || body.urgencyLevel || body.estimatedSurface || body.leadType) {
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
 * Enhanced lead score calculation supporting ALL lead types
 * @param leadData The lead data to calculate score for
 * @returns Score from 0-100
 */
function calculateLeadScore(leadData: any): number {
  let score = 0;

  // 1. BASE INFORMATION SCORE (20 points max)
  if (leadData.firstName && leadData.lastName && leadData.phone) {
    score += 15; // Basic contact info
  }
  if (leadData.email) {
    score += 5; // Email bonus
  }

  // 2. LEAD TYPE SPECIFIC SCORING (25 points max)
  if (leadData.leadType) {
    const leadTypeScores: Record<string, number> = {
      'PROFESSIONNEL': 25,    // Highest value - recurring business potential
      'PUBLIC': 22,           // High value - large contracts, stable
      'SYNDIC': 20,          // Good value - property management, recurring
      'NGO': 15,             // Medium value - project-based
      'PARTICULIER': 10,     // Lower value but still important
      'OTHER': 8             // Lowest priority
    };
    score += leadTypeScores[leadData.leadType] || 0;

    // Additional scoring for professional types with complete info
    if (['PROFESSIONNEL', 'PUBLIC', 'NGO', 'SYNDIC'].includes(leadData.leadType)) {
      if (leadData.company) score += 5; // Company name provided
      if (leadData.iceNumber) score += 3; // ICE number (legal compliance)
      if (leadData.activitySector) score += 2; // Sector information
      
      // Extra bonus for PUBLIC type with complete info
      if (leadData.leadType === 'PUBLIC' && leadData.activitySector && leadData.company) {
        score += 5; // Public sector bonus
      }
    }
  }

  // 3. BUDGET RANGE SCORING (20 points max)
  if (leadData.budgetRange) {
    const budgetScores: Record<string, number> = {
      'MOINS_1000': 5,
      'ENTRE_1000_5000': 8,
      'ENTRE_5000_15000': 12,
      'ENTRE_15000_30000': 16,
      'ENTRE_30000_50000': 18,
      'PLUS_50000': 20
    };
    score += budgetScores[leadData.budgetRange] || 0;
  }
  
  // 4. URGENCY LEVEL SCORING (15 points max)
  if (leadData.urgencyLevel) {
    const urgencyScores: Record<string, number> = {
      'IMMEDIATE': 15,
      'HIGH_URGENT': 12,
      'URGENT': 10,
      'NORMAL': 8,
      'LOW': 5
    };
    score += urgencyScores[leadData.urgencyLevel] || 0;
  }
  
  // 5. SURFACE AREA SCORING (10 points max)
  if (leadData.estimatedSurface && leadData.estimatedSurface > 0) {
    const surface = parseInt(leadData.estimatedSurface);
    if (surface >= 1000) score += 10;
    else if (surface >= 500) score += 8;
    else if (surface >= 200) score += 6;
    else if (surface >= 100) score += 4;
    else score += 2;
  }

  // 6. FREQUENCY/RECURRING BUSINESS BONUS (10 points max)
  if (leadData.frequency && leadData.frequency !== 'PONCTUEL') {
    const frequencyScores: Record<string, number> = {
      'HEBDOMADAIRE': 10,
      'MENSUEL': 9,
      'BIMENSUEL': 8,
      'TRIMESTRIEL': 6,
      'SEMESTRIEL': 5,
      'ANNUEL': 4,
      'CONTRAT_CADRE': 8,
      'RECURRING': 9
    };
    score += frequencyScores[leadData.frequency] || 0;
  }

  // 7. PROPERTY TYPE SCORING (5 points max)
  if (leadData.propertyType) {
    const propertyScores: Record<string, number> = {
      'HOTEL_LUXURY': 5,
      'COMMERCIAL': 4,
      'OFFICE': 4,
      'HOTEL_STANDARD': 4,
      'RESIDENCE_B2B': 3,
      'BUILDING': 3,
      'RESTAURANT': 3,
      'WAREHOUSE': 3,
      'VILLA_LARGE': 2,
      'APARTMENT_LARGE': 2,
      'STORE': 2,
      'VILLA_MEDIUM': 1,
      'APARTMENT_MEDIUM': 1,
      'OTHER': 1
    };
    score += propertyScores[leadData.propertyType] || 0;
  }

  // 8. COMPLETENESS BONUS (5 points max)
  let completenessBonus = 0;
  if (leadData.address) completenessBonus += 1;
  if (leadData.gpsLocation) completenessBonus += 1;
  if (leadData.originalMessage && leadData.originalMessage.length > 50) completenessBonus += 2;
  if (leadData.materials && Object.keys(leadData.materials).some(key => leadData.materials[key])) completenessBonus += 1;
  score += completenessBonus;

  // 9. ACCESSIBILITY ADJUSTMENT (-2 to +2)
  if (leadData.accessibility) {
    const accessibilityAdjustments: Record<string, number> = {
      'EASY': 2,
      'MEDIUM': 0,
      'MODERATE': -1,
      'DIFFICULT': -1,
      'VERY_DIFFICULT': -2
    };
    score += accessibilityAdjustments[leadData.accessibility] || 0;
  }

  // 10. CHANNEL QUALITY SCORING (3 points max)
  if (leadData.channel) {
    const channelScores: Record<string, number> = {
      'RECOMMANDATION_CLIENT': 3,
      'PARTENARIAT': 3,
      'APPORTEUR_AFFAIRES': 2,
      'SITE_WEB': 2,
      'FORMULAIRE_SITE': 2,
      'LINKEDIN': 2,
      'GOOGLE_SEARCH': 1,
      'GOOGLE_MAPS': 1,
      'WHATSAPP': 1,
      'EMAIL': 1
      // Other channels get 0 bonus
    };
    score += channelScores[leadData.channel] || 0;
  }

  // Ensure score doesn't exceed 100 or go below 0
  return Math.max(0, Math.min(score, 100));
}