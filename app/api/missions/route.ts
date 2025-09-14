// app/api/missions/route.ts - COMPLETE CORRECTED VERSION WITH PROPER TEAM LEADER VALIDATION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Enhanced validation schema for mission creation with flexible datetime and number handling
const createMissionSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  quoteId: z.string().optional().nullable(),
  teamLeaderId: z.string().optional().nullable(),
  teamId: z.string().optional().nullable(),
  // Fix: More flexible datetime validation that handles various formats
  scheduledDate: z.string().min(1, 'Scheduled date is required').refine((date) => {
    try {
      // Handle datetime-local format (without seconds) and full datetime
      const dateToValidate = date.includes('T') && !date.includes(':00') ? `${date}:00` : date;
      const parsedDate = new Date(dateToValidate);
      return !isNaN(parsedDate.getTime());
    } catch {
      return false;
    }
  }, {
    message: "Invalid scheduled date format"
  }),
  // Fix: Convert string to number with proper validation
  estimatedDuration: z.union([
    z.number(),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num)) throw new Error('Invalid number');
      return num;
    })
  ]).refine((val) => val >= 0.5 && val <= 24, {
    message: 'Duration must be between 0.5 and 24 hours'
  }),
  address: z.string().min(1, 'Address is required'),
  coordinates: z.string().optional().nullable(),
  accessNotes: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  type: z.enum(['SERVICE', 'TECHNICAL_VISIT', 'DELIVERY', 'INTERNAL', 'RECURRING']).default('SERVICE'),
  taskTemplateId: z.string().optional().nullable(),
  adminNotes: z.string().optional().nullable(),
  qualityScore: z.union([
    z.number(),
    z.string().transform((val) => {
      if (val === '' || val === null) return null;
      const num = parseFloat(val);
      if (isNaN(num)) return null;
      return num;
    })
  ]).optional().nullable(),
  issuesFound: z.string().optional().nullable(),
}).refine((data) => {
  // Either teamLeaderId OR teamId must be provided
  if (!data.teamLeaderId && !data.teamId) {
    return false;
  }
  return true;
}, {
  message: "Either a team leader or a team must be assigned",
  path: ["teamLeaderId", "teamId"]
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const teamLeaderId = searchParams.get('teamLeaderId');
    const teamId = searchParams.get('teamId');
    const priority = searchParams.get('priority');

    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (teamLeaderId) where.teamLeaderId = teamLeaderId;
    if (teamId) where.teamId = teamId;
    if (priority) where.priority = priority;

    // Get total count for pagination
    const total = await prisma.mission.count({ where });

    // Fetch missions with full related data - FIXED to include tasks for progress calculation
    const missions = await prisma.mission.findMany({
      where,
      skip,
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            address: true,
            propertyType: true,
            estimatedSurface: true
          }
        },
        quote: {
          select: {
            id: true,
            quoteNumber: true,
            finalPrice: true,
            status: true
          }
        },
        teamLeader: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            onlineStatus: true,
            image: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            description: true,
            members: {
              where: { isActive: true }, // FIX: Now properly filtering active members
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    image: true
                  }
                },
                availability: true
              }
            }
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            description: true,
            category: true,
            type: true,
            estimatedTime: true,
            actualTime: true,
            completedAt: true,
            assignedTo: {
              select: {
                id: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        expenses: {
          select: {
            id: true,
            amount: true,
            category: true,
            description: true,
            date: true
          }
        },
        _count: {
          select: {
            tasks: true,
            qualityChecks: true,
            expenses: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { scheduledDate: 'asc' }
      ]
    });

    // FIXED: Return the correct response structure that frontend expects
    return NextResponse.json({
      missions, // This is the key structure the frontend components expect
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Failed to fetch missions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
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

    // Only admins, managers, and agents can create missions
    if (!['ADMIN', 'MANAGER', 'AGENT'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    console.log('Creating mission with data:', body);

    // Validate the input
    const validationResult = createMissionSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Fix: Ensure scheduledDate has seconds for proper datetime parsing
    const scheduledDateString = validatedData.scheduledDate.includes('T') && 
      !validatedData.scheduledDate.includes(':00') ? 
      `${validatedData.scheduledDate}:00` : validatedData.scheduledDate;

    // Convert estimatedDuration from hours to minutes for database storage
    const estimatedDurationMinutes = Math.round(validatedData.estimatedDuration * 60);

    // Create mission in a robust transaction with proper validations
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify the lead exists
      const lead = await tx.lead.findUnique({
        where: { id: validatedData.leadId }
      });

      if (!lead) {
        throw new Error('Lead not found');
      }

      // 2. Verify the quote exists if provided
      let quote = null;
      if (validatedData.quoteId) {
        quote = await tx.quote.findUnique({
          where: { id: validatedData.quoteId }
        });

        if (!quote) {
          throw new Error('Quote not found');
        }

        // Verify the quote belongs to the lead
        if (quote.leadId !== validatedData.leadId) {
          throw new Error('Quote does not belong to the specified lead');
        }
      }

      // 3. FIXED: Enhanced team leader validation with proper isActive check
      let teamLeader = null;
      if (validatedData.teamLeaderId) {
        teamLeader = await tx.user.findUnique({
          where: { id: validatedData.teamLeaderId },
          include: {
            teamMemberships: {
              where: { isActive: true }, // FIX: Now properly checking isActive field
              include: {
                team: true
              }
            }
          }
        });

        if (!teamLeader) {
          throw new Error('Team leader not found');
        }

        // Verify the user has TEAM_LEADER role
        if (teamLeader.role !== 'TEAM_LEADER') {
          throw new Error('Selected user is not a team leader');
        }

        // FIX: Check if team leader is active team member with proper field validation
        const activeTeamMembership = teamLeader.teamMemberships.find(tm => tm.isActive === true);
        if (!activeTeamMembership) {
          throw new Error('Team leader is not an active team member');
        }
      }

      // 4. FIXED: Verify the team exists if provided with proper isActive validation
      let team = null;
      if (validatedData.teamId) {
        team = await tx.team.findUnique({
          where: { id: validatedData.teamId },
          include: {
            members: {
              where: { isActive: true }, // FIX: Use correct isActive field
              include: {
                user: true
              }
            }
          }
        });

        if (!team) {
          throw new Error('Team not found');
        }

        // If teamLeaderId is not provided but teamId is, try to find a team leader in the team
        if (!validatedData.teamLeaderId) {
          const teamLeaderInTeam = team.members.find(member => 
            member.user.role === 'TEAM_LEADER' && 
            member.availability === 'AVAILABLE' &&
            member.isActive === true  // FIX: Explicit isActive check
          );

          if (teamLeaderInTeam) {
            validatedData.teamLeaderId = teamLeaderInTeam.userId;
            teamLeader = teamLeaderInTeam.user;
          }
        }
      }

      // 5. FIXED: If still no team leader, find available team leaders with proper query
      if (!validatedData.teamLeaderId) {
        const availableTeamLeaders = await tx.user.findMany({
          where: {
            role: 'TEAM_LEADER',
            teamMemberships: {
              some: {
                isActive: true, // FIX: Use correct isActive field
                availability: 'AVAILABLE'
              }
            }
          },
          include: {
            teamMemberships: {
              where: { isActive: true }, // FIX: Use correct isActive field
              include: {
                team: true
              }
            }
          }
        });

        if (availableTeamLeaders.length === 0) {
          throw new Error('No available team leaders found. Please ensure you have created team leaders and assigned them to teams with active status.');
        }

        // Auto-assign the first available team leader
        const autoAssignedLeader = availableTeamLeaders[0];
        validatedData.teamLeaderId = autoAssignedLeader.id;
        
        // Also auto-assign their team if no team was specified
        if (!validatedData.teamId && autoAssignedLeader.teamMemberships.length > 0) {
          validatedData.teamId = autoAssignedLeader.teamMemberships[0].teamId;
        }
      }

      // 6. Generate unique mission number
      const missionCount = await tx.mission.count();
      const missionNumber = `MSN-${(missionCount + 1).toString().padStart(6, '0')}`;

      // 7. Create the mission
      const newMission = await tx.mission.create({
        data: {
          missionNumber,
          leadId: validatedData.leadId,
          quoteId: validatedData.quoteId || null,
          teamLeaderId: validatedData.teamLeaderId,
          teamId: validatedData.teamId || null,
          scheduledDate: new Date(scheduledDateString),
          estimatedDuration: estimatedDurationMinutes,
          address: validatedData.address,
          coordinates: validatedData.coordinates || null,
          accessNotes: validatedData.accessNotes || null,
          priority: validatedData.priority,
          type: validatedData.type,
          status: 'SCHEDULED'
        },
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              address: true
            }
          },
          quote: {
            select: {
              id: true,
              quoteNumber: true,
              finalPrice: true
            }
          },
          teamLeader: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          team: {
            select: {
              id: true,
              name: true,
              description: true
            }
          }
        }
      });

      // 8. Create initial conversation for the mission
      await tx.conversation.create({
        data: {
          missionId: newMission.id,
          participants: {
            connect: [
              { id: user.id }, // Current user
              { id: validatedData.teamLeaderId! } // Team leader
            ]
          }
        }
      });

      // 9. Create activity log
      await tx.activity.create({
        data: {
          type: 'MISSION_SCHEDULED',
          title: 'Mission créée',
          description: `Mission ${missionNumber} créée pour ${lead.firstName} ${lead.lastName}`,
          userId: user.id,
          leadId: validatedData.leadId,
          metadata: {
            missionId: newMission.id,
            teamLeaderId: validatedData.teamLeaderId,
            teamId: validatedData.teamId,
            scheduledDate: scheduledDateString,
            estimatedDuration: validatedData.estimatedDuration
          }
        }
      });

      // 10. Update quote status if linked
      if (validatedData.quoteId) {
        await tx.quote.update({
          where: { id: validatedData.quoteId },
          data: { status: 'ACCEPTED' }
        });
      }

      // 11. Update lead status
      await tx.lead.update({
        where: { id: validatedData.leadId },
        data: { status: 'MISSION_SCHEDULED' }
      });

      return newMission;
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    console.log('Mission created successfully:', result);
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Failed to create mission:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Enhanced error handling with more specific messages
    if (errorMessage.includes('Team leader not found')) {
      return NextResponse.json(
        { 
          error: 'Team leader not found', 
          details: 'The specified team leader does not exist or is not available.',
          suggestion: 'Please create a team leader first or select an existing one.'
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('Team leader is not an active team member')) {
      return NextResponse.json(
        { 
          error: 'Team leader is not an active team member', 
          details: 'The selected team leader is not currently active in any team.',
          suggestion: 'Please ensure the team leader is properly assigned to an active team. Check the Teams page to verify team membership status.'
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('No available team leaders found')) {
      return NextResponse.json(
        { 
          error: 'No team leaders available', 
          details: 'There are no active team leaders in the system.',
          suggestion: 'Please create a team leader and assign them to a team before creating missions. Go to Teams → New Member to add a team leader.'
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('Quote not found')) {
      return NextResponse.json(
        { 
          error: 'Quote not found', 
          details: 'The specified quote does not exist.',
          suggestion: 'Please select a valid quote or create a new one.'
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('Lead not found')) {
      return NextResponse.json(
        { 
          error: 'Lead not found', 
          details: 'The specified lead does not exist.',
          suggestion: 'Please select a valid lead.'
        },
        { status: 404 }
      );
    }

    // Handle Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string };
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Duplicate mission number or constraint violation' },
          { status: 409 }
        );
      }

      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid reference - lead, quote, team leader, or team not found' },
          { status: 400 }
        );
      }

      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Record not found during mission creation' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create mission', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// PUT method for updating missions
export async function PUT(request: NextRequest) {
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
    const missionId = searchParams.get('id');
    
    if (!missionId) {
      return new NextResponse('Mission ID required', { status: 400 });
    }

    const body = await request.json();

    // Only certain roles can update missions
    if (!['ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const updatedMission = await prisma.$transaction(async (tx) => {
      // Check if mission exists
      const existingMission = await tx.mission.findUnique({
        where: { id: missionId },
        include: {
          teamLeader: true,
          team: true
        }
      });

      if (!existingMission) {
        throw new Error('Mission not found');
      }

      // Team leaders can only update their own missions
      if (user.role === 'TEAM_LEADER' && existingMission.teamLeaderId !== user.id) {
        throw new Error('Not authorized to update this mission');
      }

      // FIXED: Validate team leader if being updated with proper isActive check
      if (body.teamLeaderId && body.teamLeaderId !== existingMission.teamLeaderId) {
        const newTeamLeader = await tx.user.findUnique({
          where: { id: body.teamLeaderId },
          include: {
            teamMemberships: {
              where: { isActive: true } // FIX: Proper isActive validation
            }
          }
        });

        if (!newTeamLeader || newTeamLeader.role !== 'TEAM_LEADER') {
          throw new Error('Invalid team leader specified');
        }

        if (newTeamLeader.teamMemberships.length === 0) {
          throw new Error('Team leader is not an active team member');
        }
      }

      // Update the mission
      const updated = await tx.mission.update({
        where: { id: missionId },
        data: {
          ...(body.scheduledDate && { scheduledDate: new Date(body.scheduledDate) }),
          ...(body.estimatedDuration && { estimatedDuration: body.estimatedDuration }),
          ...(body.address && { address: body.address }),
          ...(body.coordinates !== undefined && { coordinates: body.coordinates }),
          ...(body.accessNotes !== undefined && { accessNotes: body.accessNotes }),
          ...(body.priority && { priority: body.priority }),
          ...(body.status && { status: body.status }),
          ...(body.teamLeaderId && { teamLeaderId: body.teamLeaderId }),
          ...(body.teamId && { teamId: body.teamId }),
          ...(body.actualStartTime && { actualStartTime: new Date(body.actualStartTime) }),
          ...(body.actualEndTime && { actualEndTime: new Date(body.actualEndTime) }),
          ...(body.clientValidated !== undefined && { clientValidated: body.clientValidated }),
          ...(body.clientFeedback && { clientFeedback: body.clientFeedback }),
          ...(body.clientRating && { clientRating: body.clientRating }),
        },
        include: {
          lead: true,
          quote: true,
          teamLeader: true,
          team: {
            include: {
              members: {
                where: { isActive: true }, // FIX: Filter active members
                include: {
                  user: true
                }
              }
            }
          },
          tasks: true
        }
      });

      // Create activity log for significant updates
      if (body.status && body.status !== existingMission.status) {
        const activityType = body.status === 'IN_PROGRESS' ? 'MISSION_STARTED' : 
                           body.status === 'COMPLETED' ? 'MISSION_COMPLETED' : 'MISSION_SCHEDULED';
        
        await tx.activity.create({
          data: {
            type: activityType,
            title: 'Statut de mission mis à jour',
            description: `Mission ${existingMission.missionNumber} - statut changé de ${existingMission.status} à ${body.status}`,
            userId: user.id,
            leadId: existingMission.leadId,
            metadata: {
              missionId: existingMission.id,
              oldStatus: existingMission.status,
              newStatus: body.status
            }
          }
        });
      }

      return updated;
    });

    return NextResponse.json(updatedMission);

  } catch (error) {
    console.error('Failed to update mission:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Mission not found')) {
      return new NextResponse('Mission not found', { status: 404 });
    }

    if (errorMessage.includes('Not authorized')) {
      return new NextResponse('Not authorized to update this mission', { status: 403 });
    }

    if (errorMessage.includes('Team leader is not an active team member')) {
      return NextResponse.json(
        { 
          error: 'Team leader is not an active team member', 
          details: 'The selected team leader is not currently active in any team.',
          suggestion: 'Please ensure the team leader is properly assigned to an active team.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update mission', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// DELETE method for deleting missions (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    // Only admins can delete missions
    if (user.role !== 'ADMIN') {
      return new NextResponse('Forbidden - Admin access required', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const missionId = searchParams.get('id');
    
    if (!missionId) {
      return new NextResponse('Mission ID required', { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Check if mission exists
      const mission = await tx.mission.findUnique({
        where: { id: missionId },
        include: { lead: true }
      });

      if (!mission) {
        throw new Error('Mission not found');
      }

      // Delete related data first (cascade delete)
      await tx.task.deleteMany({ where: { missionId } });
      await tx.qualityCheck.deleteMany({ where: { missionId } });
      await tx.inventoryUsage.deleteMany({ where: { missionId } });
      await tx.expense.deleteMany({ where: { missionId } });
      
      // Delete conversation if exists
      const conversation = await tx.conversation.findUnique({ where: { missionId } });
      if (conversation) {
        await tx.message.deleteMany({ where: { conversationId: conversation.id } });
        await tx.conversation.delete({ where: { missionId } });
      }

      // Delete field report if exists
      await tx.fieldReport.deleteMany({ where: { missionId } });
      
      // Delete invoice if exists
      await tx.invoice.deleteMany({ where: { missionId } });
      
      // Finally delete the mission
      await tx.mission.delete({ where: { id: missionId } });

      // Log the deletion
      await tx.activity.create({
        data: {
          type: 'SYSTEM_MAINTENANCE',
          title: 'Mission supprimée',
          description: `Mission ${mission.missionNumber} supprimée par ${user.name}`,
          userId: user.id,
          leadId: mission.leadId,
          metadata: { 
            deletedMissionId: missionId,
            missionNumber: mission.missionNumber,
            deletedBy: user.name
          }
        }
      });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Failed to delete mission:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Mission not found')) {
      return new NextResponse('Mission not found', { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to delete mission', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}