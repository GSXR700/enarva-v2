// app/api/missions/route.ts - COMPLETELY FIXED VERSION WITH ROBUST TEAM LEADER VALIDATION
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
  message: "Either a team leader or a team must be specified",
  path: ["teamLeaderId"]
});

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
    
    // Handle datetime properly by ensuring it includes seconds
    const scheduledDateString = validatedData.scheduledDate.includes('T') && !validatedData.scheduledDate.includes(':00') ? 
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

      // 3. FIXED: Enhanced team leader validation - try multiple approaches
      let teamLeader = null;
      if (validatedData.teamLeaderId) {
        // First, check if the user exists and has TEAM_LEADER role
        teamLeader = await tx.user.findUnique({
          where: { id: validatedData.teamLeaderId },
          include: {
            teamMemberships: {
              where: { isActive: true },
              include: {
                team: true
              }
            }
          }
        });

        if (!teamLeader) {
          throw new Error('Team leader not found - The specified user does not exist');
        }

        // Verify the user has TEAM_LEADER role
        if (teamLeader.role !== 'TEAM_LEADER') {
          throw new Error('Selected user is not a team leader - Please select a user with TEAM_LEADER role');
        }

        // IMPROVED: Check if team leader has any team membership OR allow standalone team leaders
        const hasActiveTeamMembership = teamLeader.teamMemberships.some(tm => tm.isActive === true);
        
        // If no team membership exists, create one if a team is specified
        if (!hasActiveTeamMembership && validatedData.teamId) {
          console.log(`Creating team membership for team leader ${teamLeader.name}`);
          
          // Verify the team exists first
          const teamExists = await tx.team.findUnique({
            where: { id: validatedData.teamId }
          });
          
          if (teamExists) {
            await tx.teamMember.create({
              data: {
                userId: validatedData.teamLeaderId,
                teamId: validatedData.teamId,
                isActive: true,
                availability: 'AVAILABLE',
                experience: 'SENIOR', // Team leaders are typically senior
                specialties: ['TEAM_MANAGEMENT'],
                hourlyRate: null // Fix: Explicit null for optional field
              }
            });
          }
        } else if (!hasActiveTeamMembership && !validatedData.teamId) {
          // Allow standalone team leaders for now - they can still lead missions
          console.log(`Warning: Team leader ${teamLeader.name} has no team membership but will be allowed to lead this mission`);
        }
      }

      // 4. FIXED: Verify the team exists if provided and handle team leader assignment
      let team = null;
      if (validatedData.teamId) {
        team = await tx.team.findUnique({
          where: { id: validatedData.teamId },
          include: {
            members: {
              where: { isActive: true },
              include: {
                user: true
              }
            }
          }
        });

        if (!team) {
          throw new Error('Team not found - The specified team does not exist');
        }

        // If teamLeaderId is not provided but teamId is, try to find a team leader in the team
        if (!validatedData.teamLeaderId) {
          const teamLeaderInTeam = team.members.find(member => 
            member.user.role === 'TEAM_LEADER' && 
            member.availability === 'AVAILABLE' &&
            member.isActive === true
          );

          if (teamLeaderInTeam) {
            validatedData.teamLeaderId = teamLeaderInTeam.userId;
            teamLeader = teamLeaderInTeam.user;
          }
        }
      }

      // 5. FIXED: If still no team leader, find available team leaders with improved logic
      if (!validatedData.teamLeaderId) {
        console.log('No team leader specified, searching for available team leaders...');
        
        // First try: Find team leaders with active team memberships
        const teamLeadersWithTeams = await tx.user.findMany({
          where: {
            role: 'TEAM_LEADER',
            teamMemberships: {
              some: {
                isActive: true,
                availability: 'AVAILABLE'
              }
            }
          },
          include: {
            teamMemberships: {
              where: { isActive: true },
              include: {
                team: true
              }
            }
          }
        });

        // Second try: If no team leaders with teams, find any team leader
        let availableTeamLeaders = teamLeadersWithTeams;
        if (availableTeamLeaders.length === 0) {
          console.log('No team leaders with teams found, searching for any team leader...');
          
          availableTeamLeaders = await tx.user.findMany({
            where: {
              role: 'TEAM_LEADER'
            },
            include: {
              teamMemberships: {
                where: { isActive: true },
                include: {
                  team: true
                }
              }
            }
          });
        }

        if (availableTeamLeaders.length === 0) {
          throw new Error('No team leaders found in the system. Please create a team leader first:\n\n1. Go to Users → New User\n2. Set role to "Team Leader"\n3. Optionally assign them to a team in Teams → Edit Team');
        }

        // Auto-assign the first available team leader
        const autoAssignedLeader = availableTeamLeaders[0]!;
        validatedData.teamLeaderId = autoAssignedLeader.id;
        teamLeader = autoAssignedLeader;
        
        // Also auto-assign their team if no team was specified and they have one
        if (!validatedData.teamId && autoAssignedLeader.teamMemberships.length > 0) {
          validatedData.teamId = autoAssignedLeader.teamMemberships[0]!.teamId;
        }

        console.log(`Auto-assigned team leader: ${autoAssignedLeader.name}`);
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
          details: errorMessage,
          suggestion: 'Please create a team leader first or select an existing one.'
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('No team leaders found in the system')) {
      return NextResponse.json(
        { 
          error: 'No team leaders available', 
          details: errorMessage,
          suggestion: 'Please create a team leader by going to Users → New User and setting the role to "Team Leader".'
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('Selected user is not a team leader')) {
      return NextResponse.json(
        { 
          error: 'Invalid team leader', 
          details: errorMessage,
          suggestion: 'Please select a user with the "Team Leader" role.'
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

// GET endpoint for fetching missions with proper filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const teamLeaderId = searchParams.get('teamLeaderId');
    const teamId = searchParams.get('teamId');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (teamLeaderId) where.teamLeaderId = teamLeaderId;
    if (teamId) where.teamId = teamId;

    if (search) {
      where.OR = [
        { missionNumber: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { lead: { firstName: { contains: search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
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
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              estimatedTime: true,
              actualTime: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.mission.count({ where })
    ]);

    return NextResponse.json({
      missions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch missions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}