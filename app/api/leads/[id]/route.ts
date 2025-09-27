// app/api/leads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { leadService } from '@/services/lead.service';
import { validateCompleteLeadInput, cleanLeadData } from '@/lib/validations';
import { errorHandler } from '@/lib/error-handler';
import { pusherServer } from '@/lib/pusher';
import { ExtendedUser } from '@/types/next-auth';

export async function GET(
  _request: NextRequest,
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
    console.error('GET Error in /api/leads/[id]/route.ts:', error);
    return errorHandler(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🔍 PATCH /api/leads/[id] - Starting request');
  
  try {
    // Step 1: Authentication
    console.log('🔍 Step 1: Checking authentication');
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('❌ No session or user found');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id) {
      console.log('❌ User has no ID');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    console.log('✅ User authenticated:', user.id, user.role);

    // Step 2: Get lead ID
    console.log('🔍 Step 2: Getting lead ID from params');
    const { id: leadId } = await params;
    console.log('✅ Lead ID:', leadId);
    
    // Step 3: Check if lead exists
    console.log('🔍 Step 3: Fetching existing lead');
    const existingLead = await leadService.getLeadById(leadId);
    if (!existingLead) {
      console.log('❌ Lead not found');
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }
    console.log('✅ Existing lead found:', existingLead.firstName, existingLead.lastName);

    // Step 4: Check permissions
    console.log('🔍 Step 4: Checking permissions');
    const canEdit = (
      user.role === 'ADMIN' ||
      user.role === 'MANAGER' ||
      (user.role === 'AGENT' && existingLead.assignedToId === user.id)
    );

    if (!canEdit) {
      console.log('❌ Insufficient permissions');
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }
    console.log('✅ User has permissions to edit');

    // Step 5: Parse request body
    console.log('🔍 Step 5: Parsing request body');
    const body = await request.json();
    console.log('✅ Request body parsed, keys:', Object.keys(body));

    // Step 6: Clean data
    console.log('🔍 Step 6: Cleaning data');
    try {
      const cleanedData = cleanLeadData(body);
      console.log('✅ Data cleaned successfully, keys:', Object.keys(cleanedData));
      
      // Step 7: Determine if partial update
      console.log('🔍 Step 7: Determining update type');
      const isPartialUpdate = Object.keys(cleanedData).length <= 3 && (
        cleanedData.status || 
        cleanedData.assignedToId !== undefined ||
        cleanedData.score !== undefined
      );
      console.log('✅ Is partial update:', isPartialUpdate);
      
      let updateData = cleanedData;

      // Step 8: Validation (only for full updates)
      if (!isPartialUpdate) {
        console.log('🔍 Step 8: Running validation for full update');
        try {
          const validation = validateCompleteLeadInput(cleanedData, false);
          if (!validation.success) {
            console.log('❌ Validation failed:', validation.error.errors);
            return NextResponse.json(
              { 
                error: 'Données invalides', 
                details: validation.error.errors.map((e: any) => e.message)
              },
              { status: 400 }
            );
          }
          console.log('✅ Validation passed');
        } catch (validationError) {
          console.error('❌ Validation error occurred:', validationError);
          throw validationError;
        }
      } else {
        console.log('✅ Skipping validation for partial update');
      }

      // Step 9: Calculate score if needed
      console.log('🔍 Step 9: Checking if score calculation needed');
      if (!isPartialUpdate || body.budgetRange || body.urgencyLevel || body.estimatedSurface || body.leadType) {
        console.log('🔍 Calculating score...');
        const mergedData = { ...existingLead, ...updateData };
        updateData.score = calculateLeadScore(mergedData);
        console.log('✅ Score calculated:', updateData.score);
      }

      // Step 10: Store previous values for logging and Pusher
      const previousStatus = existingLead.status;
      const previousAssignedToId = existingLead.assignedToId;

      // Step 11: Update the lead
      console.log('🔍 Step 11: Updating lead in database');
      const updatedLead = await leadService.updateLead(leadId, updateData);
      console.log('✅ Lead updated successfully');

      // Step 12: Send Pusher notifications for real-time updates
      console.log('🔍 Step 12: Sending Pusher notifications');
      if (process.env.PUSHER_APP_ID) {
        try {
          // Send general lead update notification
          await pusherServer.trigger('leads-channel', 'lead-updated', {
            id: updatedLead.id,
            firstName: updatedLead.firstName,
            lastName: updatedLead.lastName,
            status: updatedLead.status,
            score: updatedLead.score,
            assignedToId: updatedLead.assignedToId,
            updatedAt: updatedLead.updatedAt,
            changes: Object.keys(updateData),
            updatedBy: user.name || user.email
          });

          // Send specific notifications for important changes
          if (body.status && body.status !== previousStatus) {
            await pusherServer.trigger('leads-channel', 'lead-status-changed', {
              id: updatedLead.id,
              firstName: updatedLead.firstName,
              lastName: updatedLead.lastName,
              oldStatus: previousStatus,
              newStatus: body.status,
              updatedBy: user.name || user.email
            });
          }

          if (body.assignedToId !== undefined && body.assignedToId !== previousAssignedToId) {
            await pusherServer.trigger('leads-channel', 'lead-assigned', {
              id: updatedLead.id,
              firstName: updatedLead.firstName,
              lastName: updatedLead.lastName,
              oldAssignedToId: previousAssignedToId,
              newAssignedToId: body.assignedToId,
              assignedBy: user.name || user.email
            });
          }

          console.log('✅ Pusher notifications sent successfully');
        } catch (pusherError) {
          console.warn('⚠️ Pusher notification failed:', pusherError);
          // Don't fail the request if Pusher fails
        }
      }

      // Step 13: Log activities (if needed)
      console.log('🔍 Step 13: Logging activities');
      
      // Log status changes
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
          console.log('✅ Status change logged');
        } catch (activityError) {
          console.warn('⚠️ Failed to log status change activity:', activityError);
        }
      }

      // Log assignment changes
      if (body.assignedToId !== undefined && body.assignedToId !== previousAssignedToId) {
        try {
          await leadService.logActivity({
            type: 'LEAD_CREATED',
            title: 'Assignation modifiée',
            description: body.assignedToId 
              ? `Lead assigné à un nouvel agent` 
              : 'Assignation du lead supprimée',
            leadId: leadId,
            userId: user.id,
            metadata: {
              oldAssignedToId: previousAssignedToId,
              newAssignedToId: body.assignedToId
            }
          });
          console.log('✅ Assignment change logged');
        } catch (activityError) {
          console.warn('⚠️ Failed to log assignment change activity:', activityError);
        }
      }

      console.log('✅ PATCH /api/leads/[id] - Request completed successfully');
      return NextResponse.json(updatedLead);
      
    } catch (dataCleaningError) {
      console.error('❌ Error in data cleaning step:', dataCleaningError);
      throw dataCleaningError;
    }

  } catch (error) {
    console.error('❌ PATCH Error in /api/leads/[id]/route.ts:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return errorHandler(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }
    
    const user = session.user as ExtendedUser;
    if (!user.id || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 });
    }

    const { id: leadId } = await params;

    const existingLead = await leadService.getLeadById(leadId);
    if (!existingLead) {
      return NextResponse.json({ error: 'Lead non trouvé' }, { status: 404 });
    }

    await leadService.deleteLead(leadId);

    // Send Pusher notification for lead deletion
    if (process.env.PUSHER_APP_ID) {
      try {
        await pusherServer.trigger('leads-channel', 'lead-deleted', {
          id: leadId,
          firstName: existingLead.firstName,
          lastName: existingLead.lastName,
          deletedBy: user.name || user.email
        });
      } catch (pusherError) {
        console.warn('Pusher notification failed:', pusherError);
      }
    }

    try {
      await leadService.logActivity({
        type: 'LEAD_CREATED',
        title: 'Lead supprimé',
        description: `Lead ${existingLead.firstName} ${existingLead.lastName} supprimé par ${user.name}`,
        leadId: leadId,
        userId: user.id,
        metadata: {
          deletedLead: {
            firstName: existingLead.firstName,
            lastName: existingLead.lastName,
            phone: existingLead.phone,
            status: existingLead.status
          }
        }
      });
    } catch (activityError) {
      console.warn('Expected: Could not log deletion activity after lead deletion:', activityError);
    }

    return NextResponse.json({ message: 'Lead supprimé avec succès' });
  } catch (error) {
    console.error('DELETE Error in /api/leads/[id]/route.ts:', error);
    return errorHandler(error);
  }
}

function calculateLeadScore(leadData: any): number {
  let score = 0;

  if (leadData.firstName && leadData.lastName && leadData.phone) {
    score += 15;
  }
  if (leadData.email) {
    score += 5;
  }

  if (leadData.leadType) {
    const leadTypeScores: Record<string, number> = {
      'PROFESSIONNEL': 25,
      'PUBLIC': 22,
      'SYNDIC': 20,
      'NGO': 15,
      'PARTICULIER': 10,
      'OTHER': 8
    };
    score += leadTypeScores[leadData.leadType] || 0;

    if (['PROFESSIONNEL', 'PUBLIC', 'NGO', 'SYNDIC'].includes(leadData.leadType)) {
      if (leadData.company) score += 5;
      if (leadData.iceNumber) score += 3;
      if (leadData.activitySector) score += 2;
      
      if (leadData.leadType === 'PUBLIC' && leadData.activitySector && leadData.company) {
        score += 5;
      }
    }
  }

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
  
  if (leadData.estimatedSurface && leadData.estimatedSurface > 0) {
    const surface = parseInt(leadData.estimatedSurface);
    if (surface >= 1000) score += 10;
    else if (surface >= 500) score += 8;
    else if (surface >= 200) score += 6;
    else if (surface >= 100) score += 4;
    else score += 2;
  }

  if (leadData.frequency && leadData.frequency !== 'PONCTUEL') {
    const frequencyScores: Record<string, number> = {
      'HEBDOMADAIRE': 10,
      'MENSUEL': 9,
      'BIMENSUEL': 8,
      'TRIMESTRIEL': 6,
      'ANNUEL': 4,
      'PERSONNALISE': 7
    };
    score += frequencyScores[leadData.frequency] || 0;
  }

  if (leadData.propertyType) {
    const propertyScores: Record<string, number> = {
      'HOTEL_LUXURY': 5,
      'COMMERCIAL': 4,
      'OFFICE': 4,
      'HOTEL_STANDARD': 4,
      'RESIDENCE_B2B': 3,
      'BUILDING': 3,
      'RESTAURANT': 3,
      'WAREHOUSE': 5,
      'VILLA_LARGE': 2,
      'APARTMENT_LARGE': 2,
      'STORE': 2,
      'VILLA_MEDIUM': 1,
      'APARTMENT_MEDIUM': 1,
      'VILLA_SMALL': 1,
      'APARTMENT_SMALL': 1,
      'PENTHOUSE': 3,
      'APARTMENT_MULTI': 2,
      'OTHER': 1
    };
    score += propertyScores[leadData.propertyType] || 0;
  }

  let completenessBonus = 0;
  if (leadData.address) completenessBonus += 1;
  if (leadData.gpsLocation) completenessBonus += 1;
  if (leadData.originalMessage && leadData.originalMessage.length > 50) completenessBonus += 2;
  if (leadData.materials && typeof leadData.materials === 'object' && 
      Object.keys(leadData.materials).some(key => leadData.materials[key])) {
    completenessBonus += 1;
  }
  score += completenessBonus;

  if (leadData.channel) {
    const channelScores: Record<string, number> = {
      'RECOMMANDATION': 3,
      'PROSPECTION': 3,
      'SALON': 2,
      'SITE_WEB': 2,
      'FORMULAIRE_SITE': 2,
      'EMAIL': 2,
      'TELEPHONE': 1,
      'FACEBOOK': 1,
      'INSTAGRAM': 1,
      'GOOGLE_ADS': 1,
      'AFFICHAGE': 1,
      'AUTRE': 0
    };
    score += channelScores[leadData.channel] || 0;
  }

  return Math.max(0, Math.min(score, 100));
}