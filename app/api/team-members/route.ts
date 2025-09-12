// app/api/team-members/route.ts - COMPLETE FIXED VERSION (No TypeScript Errors)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
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
  
  // Critical missing field with proper validation
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const teamId = searchParams.get('teamId');
    const role = searchParams.get('role');
    const availability = searchParams.get('availability');

    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const where: any = {};
    
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }
    
    if (teamId) where.teamId = teamId;
    if (role) where.user = { ...where.user, role };
    if (availability) where.availability = availability;

    // Get total count for pagination
    const total = await prisma.teamMember.count({ where });

    // Fetch team members with enhanced data (FIXED: removed non-existent fields)
    const teamMembers = await prisma.teamMember.findMany({
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
            status: true,
            estimatedTime: true,
            actualTime: true,
            completedAt: true
          }
        }
      },
      orderBy: [
        { joinedAt: 'desc' }  // FIXED: Use joinedAt instead of createdAt
      ]
    });

    // Enhanced team member data with performance metrics (FIXED: proper type handling)
    const enhancedTeamMembers = teamMembers.map(member => {
      const completedTasks = member.tasks.filter((t: any) => t.status === 'COMPLETED').length;
      const totalTasks = member.tasks.length;
      
      return {
        ...member,
        stats: {
          totalTasks,
          completedTasks,
          completionRate: totalTasks > 0 
            ? (completedTasks / totalTasks * 100).toFixed(1)
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

    // Create user and team member in a robust transaction
    const result = await prisma.$transaction(async (tx) => {
      try {
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

        // Create the team member record with ALL required fields
        const newTeamMember = await tx.teamMember.create({
          data: {
            userId: newUser.id,
            teamId: validatedData.teamId,
            specialties: validatedData.specialties || [],
            experience: validatedData.experience,
            availability: validatedData.availability,
            hourlyRate: validatedData.hourlyRate || null,
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
                lastSeen: true
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

        // Create activity log with proper enum value
        await tx.activity.create({
          data: {
            type: 'TEAM_MEMBER_CREATED', // Use proper ActivityType enum value
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
      } catch (error) {
        console.error('Transaction error:', error);
        throw error;
      }
    }, {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
    });

    console.log('Team member created successfully:', result);
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Failed to create team member:', error);
    
    // Enhanced error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    // Handle specific Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string }
      
      if (prismaError.code === 'P2002') {
        return NextResponse.json(
          { error: 'Email address already exists or user is already a team member' },
          { status: 409 }
        )
      }

      if (prismaError.code === 'P2003') {
        return NextResponse.json(
          { error: 'Invalid team ID provided' },
          { status: 400 }
        )
      }

      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          { error: 'Related record not found' },
          { status: 404 }
        )
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
              lastSeen: true
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
  } finally {
    await prisma.$disconnect();
  }
}