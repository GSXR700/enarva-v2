// app/api/team-members/route.ts - COMPLETE FIXED VERSION WITH TYPESCRIPT STRICT TYPING
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Enhanced validation schema with ALL required fields
const createTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email address').max(100, 'Email too long'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase, uppercase and digit'),
  phone: z.string().min(10, 'Phone number required').max(20, 'Phone number invalid').optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN']),
  teamId: z.string().min(1, 'Team ID is required'),
  
  // Enhanced fields that were missing
  specialties: z.array(z.enum([
    'GENERAL_CLEANING', 'WINDOW_SPECIALIST', 'FLOOR_SPECIALIST', 
    'LUXURY_SURFACES', 'EQUIPMENT_HANDLING', 'TEAM_MANAGEMENT', 
    'QUALITY_CONTROL', 'DETAIL_FINISHING'
  ])).default([]).optional(),
  
  experience: z.enum(['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']).default('JUNIOR'),
  availability: z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION']).default('AVAILABLE'),
  
  // Critical missing field with proper validation - FIXED for TypeScript strict typing
  hourlyRate: z.number()
    .min(0, 'Hourly rate must be positive')
    .max(1000, 'Hourly rate too high')
    .optional()
    .nullable()
    .transform(val => val ?? null), // IMPORTANT: Convert undefined to null for Prisma
    
  isActive: z.boolean().default(true)
}).refine((data) => {
  // Custom validation: senior/expert roles should have hourly rate
  if (['SENIOR', 'EXPERT'].includes(data.experience) && !data.hourlyRate) {
    return false;
  }
  return true;
}, {
  message: "Hourly rate is required for Senior and Expert levels",
  path: ["hourlyRate"]
}).refine((data) => {
  // Custom validation: team leaders should have team management specialty
  if (data.role === 'TEAM_LEADER' && (!data.specialties || !data.specialties.includes('TEAM_MANAGEMENT'))) {
    return false;
  }
  return true;
}, {
  message: "Team leaders must have 'TEAM_MANAGEMENT' specialty",
  path: ["specialties"]
});

// Add existing users to team schema - FIXED for TypeScript strict typing
const addExistingUserToTeamSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  teamId: z.string().min(1, 'Team ID is required'),
  specialties: z.array(z.enum([
    'GENERAL_CLEANING', 'WINDOW_SPECIALIST', 'FLOOR_SPECIALIST',
    'LUXURY_SURFACES', 'EQUIPMENT_HANDLING', 'TEAM_MANAGEMENT',
    'QUALITY_CONTROL', 'DETAIL_FINISHING'
  ])).default([]),
  experience: z.enum(['JUNIOR', 'INTERMEDIATE', 'SENIOR', 'EXPERT']).default('JUNIOR'),
  availability: z.enum(['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION']).default('AVAILABLE'),
  hourlyRate: z.number()
    .min(0, 'Hourly rate must be positive')
    .max(1000, 'Hourly rate too high')
    .optional()
    .nullable()
    .transform(val => val ?? null), // IMPORTANT: Convert undefined to null for Prisma
  isActive: z.boolean().default(true)
});

// Type-safe helper function for creating team member data
function createTeamMemberData(input: {
  userId: string;
  teamId: string;
  specialties: string[];
  experience: string;
  availability: string;
  hourlyRate: number | null;
  isActive: boolean;
}): Prisma.TeamMemberUncheckedCreateInput {
  return {
    userId: input.userId,
    teamId: input.teamId,
    specialties: input.specialties as any,
    experience: input.experience as any,
    availability: input.availability as any,
    hourlyRate: input.hourlyRate, // Already null if undefined due to transform
    isActive: input.isActive,
    joinedAt: new Date()
  };
}

// GET /api/team-members - Fetch team members with enhanced filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const teamId = searchParams.get('teamId');
    const role = searchParams.get('role');
    const availability = searchParams.get('availability');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const skip = (page - 1) * limit;

    // Build where clause for filtering
    const where: any = {};

    if (teamId) where.teamId = teamId;
    if (availability) where.availability = availability;
    if (isActive !== null) where.isActive = isActive === 'true';

    // Add user role filtering
    if (role) {
      where.user = { role };
    }

    // Add search filtering
    if (search) {
      where.user = {
        ...where.user,
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [teamMembers, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
              onlineStatus: true,
              lastSeen: true
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
              actualTime: true,
              completedAt: true
            }
          }
        },
        orderBy: [
          { isActive: 'desc' },
          { user: { role: 'desc' } },
          { user: { name: 'asc' } }
        ],
        skip,
        take: limit
      }),
      prisma.teamMember.count({ where })
    ]);

    // Enhance team members with performance metrics
    const enhancedTeamMembers = teamMembers.map(member => {
      const completedTasks = member.tasks.filter(task => task.status === 'COMPLETED').length;
      const totalTasks = member.tasks.length;

      return {
        ...member,
        stats: {
          completedTasks,
          totalTasks,
          completionRate: totalTasks > 0 ? 
            (completedTasks / totalTasks * 100).toFixed(1)
            : '0.0'
        },
        performance: {
          averageTaskTime: member.tasks.reduce((acc: number, task: any) => 
            acc + (task.actualTime || task.estimatedTime || 0), 0
          ) / (member.tasks.length || 1),
          onTimeCompletion: member.tasks.filter((task: any) => 
            task.actualTime && task.estimatedTime && task.actualTime <= task.estimatedTime
          ).length
        }
      };
    });

    return NextResponse.json({
      teamMembers: enhancedTeamMembers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters: {
        availableRoles: ['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER', 'TECHNICIAN'],
        availableStatuses: ['AVAILABLE', 'BUSY', 'OFF_DUTY', 'VACATION']
      }
    });
  } catch (error) {
    console.error('Failed to fetch team members:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// POST /api/team-members - Create new team member OR add existing user to team
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

    // Only admins and managers can create team members
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    console.log('Creating team member with data:', body);

    // Check if this is adding an existing user to a team
    if (body.userId && !body.name && !body.email && !body.password) {
      // This is adding an existing user to a team
      const validationResult = addExistingUserToTeamSchema.safeParse(body);
      if (!validationResult.success) {
        console.error('Validation errors for existing user:', validationResult.error.errors);
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

      const result = await prisma.$transaction(async (tx) => {
        // Verify the user exists
        const existingUser = await tx.user.findUnique({
          where: { id: validatedData.userId }
        });

        if (!existingUser) {
          throw new Error('User not found');
        }

        // Verify the team exists
        const team = await tx.team.findUnique({
          where: { id: validatedData.teamId }
        });

        if (!team) {
          throw new Error('Team not found');
        }

        // Check if user is already a member of this team
        const existingMembership = await tx.teamMember.findUnique({
          where: {
            userId_teamId: {
              userId: validatedData.userId,
              teamId: validatedData.teamId
            }
          }
        });

        if (existingMembership) {
          throw new Error('User is already a member of this team');
        }

        // Create team membership - FIXED for TypeScript strict typing
        const teamMemberData = createTeamMemberData({
          userId: validatedData.userId,
          teamId: validatedData.teamId,
          specialties: validatedData.specialties,
          experience: validatedData.experience,
          availability: validatedData.availability,
          hourlyRate: validatedData.hourlyRate,
          isActive: validatedData.isActive
        });

        const newTeamMember = await tx.teamMember.create({
          data: teamMemberData,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true
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

        // Create activity log
        await tx.activity.create({
          data: {
            type: 'TEAM_MEMBER_CREATED',
            title: 'Membre ajouté à l\'équipe',
            description: `${existingUser.name} ajouté à l'équipe ${team.name}`,
            userId: user.id,
            metadata: {
              teamMemberId: newTeamMember.id,
              userId: validatedData.userId,
              teamId: validatedData.teamId,
              userRole: existingUser.role
            }
          }
        });

        return newTeamMember;
      });

      console.log('Existing user added to team successfully:', result);
      return NextResponse.json(result, { status: 201 });
    }

    // This is creating a new user AND adding them to a team
    const validationResult = createTeamMemberSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation errors for new user:', validationResult.error.errors);
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

    const result = await prisma.$transaction(async (tx) => {
      // Check if email already exists
      const existingUser = await tx.user.findUnique({
        where: { email: validatedData.email }
      });

      if (existingUser) {
        throw new Error(`User with email ${validatedData.email} already exists`);
      }

      // Verify the team exists
      const team = await tx.team.findUnique({
        where: { id: validatedData.teamId }
      });

      if (!team) {
        throw new Error('Team not found');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 12);

      // FIXED: Ensure team leaders have team management specialty
      let specialties = validatedData.specialties || [];
      if (validatedData.role === 'TEAM_LEADER' && !specialties.includes('TEAM_MANAGEMENT')) {
        specialties = [...specialties, 'TEAM_MANAGEMENT'];
      }

      // Create the user first
      const newUser = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          hashedPassword,
          role: validatedData.role
        }
      });

      // Then create team membership - FIXED for TypeScript strict typing
      const teamMemberData = createTeamMemberData({
        userId: newUser.id,
        teamId: validatedData.teamId,
        specialties,
        experience: validatedData.experience,
        availability: validatedData.availability,
        hourlyRate: validatedData.hourlyRate,
        isActive: validatedData.isActive
      });

      const newTeamMember = await tx.teamMember.create({
        data: teamMemberData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true
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

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'TEAM_MEMBER_CREATED',
          title: 'Nouveau membre créé',
          description: `${validatedData.name} créé comme ${validatedData.role} dans l'équipe ${team.name}`,
          userId: user.id,
          metadata: {
            teamMemberId: newTeamMember.id,
            newUserId: newUser.id,
            teamId: validatedData.teamId,
            userRole: validatedData.role
          }
        }
      });

      return newTeamMember;
    }, {
      maxWait: 5000,
      timeout: 10000,
    });

    console.log('New team member created successfully:', result);
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Failed to create team member:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('User with email') && errorMessage.includes('already exists')) {
      return NextResponse.json(
        { 
          error: 'Email already exists', 
          details: errorMessage,
          suggestion: 'Please use a different email address or add the existing user to the team instead.'
        },
        { status: 409 }
      );
    }

    if (errorMessage.includes('Team not found')) {
      return NextResponse.json(
        { 
          error: 'Team not found', 
          details: 'The specified team does not exist.',
          suggestion: 'Please select a valid team or create a new team first.'
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('User not found')) {
      return NextResponse.json(
        { 
          error: 'User not found', 
          details: 'The specified user does not exist.',
          suggestion: 'Please select a valid user.'
        },
        { status: 404 }
      );
    }

    if (errorMessage.includes('already a member of this team')) {
      return NextResponse.json(
        { 
          error: 'User already in team', 
          details: errorMessage,
          suggestion: 'This user is already a member of the specified team.'
        },
        { status: 409 }
      );
    }

    // Handle Prisma constraint errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string };
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Constraint violation - user may already exist or be in team' },
          { status: 409 }
        );
      }

      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid reference - user or team not found' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to create team member', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}