// app/api/team-members/route.ts - COMPLETE FIXED VERSION
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const prisma = new PrismaClient();

// Enhanced validation schema with ALL missing fields
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
  
  // Critical missing field
  hourlyRate: z.number()
    .min(0, 'Hourly rate must be positive')
    .max(1000, 'Hourly rate too high')
    .optional()
    .nullable(),
    
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
  // Custom validation: team leaders should have management specialty
  if (data.role === 'TEAM_LEADER' && !data.specialties?.includes('TEAM_MANAGEMENT')) {
    return false;
  }
  return true;
}, {
  message: "Team leaders must have 'Team Management' specialty",
  path: ["specialties"]
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    // Only admins and managers can view all team members
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const roleFilter = searchParams.get('role');
    const teamFilter = searchParams.get('team');
    const statusFilter = searchParams.get('status');

    let where: any = {};

    // Enhanced filtering
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    if (roleFilter && roleFilter !== 'all') {
      where.user = {
        ...where.user,
        role: roleFilter
      };
    }

    if (teamFilter && teamFilter !== 'all') {
      where.teamId = teamFilter;
    }

    if (statusFilter && statusFilter !== 'all') {
      where.availability = statusFilter;
    }

    const skip = (page - 1) * limit;

    const [teamMembers, total] = await Promise.all([
      prisma.teamMember.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
              onlineStatus: true,
              lastSeen: true,
              createdAt: true,
              updatedAt: true
            },
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
              mission: {
                select: {
                  id: true,
                  missionNumber: true,
                  status: true,
                  scheduledDate: true
                },
              },
            },
            where: {
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.teamMember.count({ where }),
    ]);

    // Calculate additional metrics for each team member
    const enhancedTeamMembers = teamMembers.map(member => ({
      ...member,
      productivity: {
        totalTasks: member._count.tasks,
        activeTasks: member.tasks.length,
        completionRate: member._count.tasks > 0 
          ? (member.tasks.filter(t => t.status === 'COMPLETED').length / member._count.tasks * 100).toFixed(1)
          : '0.0'
      },
      performance: {
        averageTaskTime: member.tasks.reduce((acc, task) => 
          acc + (task.actualTime || task.estimatedTime || 0), 0
        ) / (member.tasks.length || 1),
        onTimeCompletion: member.tasks.filter(task => 
          task.actualTime && task.estimatedTime && task.actualTime <= task.estimatedTime
        ).length
      }
    }));

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

    // Only admins and managers can create team members
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    console.log('Creating team member with data:', body);

    // Validate the input with enhanced schema
    const validationResult = createTeamMemberSchema.safeParse(body);
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

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Check if team exists
    const team = await prisma.team.findUnique({
      where: { id: validatedData.teamId }
    });

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      );
    }

    // Hash the password with stronger hashing
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Create user and team member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the user first
      const newUser = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          hashedPassword,
          role: validatedData.role,
          onlineStatus: 'OFFLINE',
        },
      });

      // Create the team member record with ALL fields
      const newTeamMember = await tx.teamMember.create({
        data: {
          userId: newUser.id,
          teamId: validatedData.teamId,
          specialties: validatedData.specialties || [],
          experience: validatedData.experience,
          availability: validatedData.availability,
          hourlyRate: validatedData.hourlyRate || null, // Critical missing field
          isActive: validatedData.isActive,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
              onlineStatus: true,
              lastSeen: true,
              createdAt: true,
              updatedAt: true
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

      // Create activity log - FIX: Use valid ActivityType enum
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Fix: Use valid ActivityType enum value instead of USER_CREATED
          title: 'Nouveau membre d\'équipe créé',
          description: `${newUser.name} a été ajouté à l'équipe ${team.name}`,
          userId: user.id,
          metadata: {
            newUserId: newUser.id,
            teamId: validatedData.teamId,
            role: validatedData.role,
            specialties: validatedData.specialties,
            experience: validatedData.experience
          }
        }
      });

      return newTeamMember;
    });

    console.log('Team member created successfully:', result);
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Failed to create team member:', error);
    
    // Fix: Proper error type handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string }
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Email address already exists' },
          { status: 409 }
        )
      }

      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid team ID provided' },
          { status: 400 }
        )
      }
    }

    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// PATCH method for updating team members
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamMemberId = searchParams.get('id');
    
    if (!teamMemberId) {
      return new NextResponse('Team member ID required', { status: 400 });
    }

    const body = await request.json();
    const updateData: any = {};

    // Handle user data updates
    const userData: any = {};
    if (body.name) userData.name = body.name;
    if (body.email) userData.email = body.email;
    if (body.role) userData.role = body.role;

    // Handle team member data updates
    if (body.specialties !== undefined) updateData.specialties = body.specialties;
    if (body.experience !== undefined) updateData.experience = body.experience;
    if (body.availability !== undefined) updateData.availability = body.availability;
    if (body.hourlyRate !== undefined) updateData.hourlyRate = body.hourlyRate;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const updatedTeamMember = await prisma.$transaction(async (tx) => {
      // Update user data if provided
      if (Object.keys(userData).length > 0) {
        await tx.user.update({
          where: { id: body.userId },
          data: userData
        });
      }

      // Update team member data
      return await tx.teamMember.update({
        where: { id: teamMemberId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              image: true,
              onlineStatus: true,
              lastSeen: true,
              createdAt: true,
              updatedAt: true
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
    });

    return NextResponse.json(updatedTeamMember);

  } catch (error) {
    console.error('Failed to update team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}