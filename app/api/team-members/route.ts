import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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

    let where: any = {};

    if (search) {
      where = {
        user: {
          name: { contains: search, mode: 'insensitive' },
        },
      };
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
            },
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              mission: {
                select: {
                  id: true,
                  missionNumber: true,
                },
              },
            },
            where: {
              status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
            },
            take: 10,
          },
          _count: {
            select: {
              tasks: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' }, // Changed from createdAt to joinedAt
      }),
      prisma.teamMember.count({ where }),
    ]);

    return NextResponse.json({
      teamMembers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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

    // Only admins can create team members
    if (user.role !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      phone,
      role,
      password,
      teamId, // Added teamId
      specialties,
      experienceLevel,
      availability,
    } = body;

    // Validate required fields
    if (!name || !email || !phone || !role || !password || !teamId) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new NextResponse('Email already exists', { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user and team member in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          hashedPassword: hashedPassword, // Corrected field name
          role,
          onlineStatus: 'OFFLINE',
        },
      });

      // Create team member
      const teamMember = await tx.teamMember.create({
        data: {
          userId: newUser.id,
          teamId: teamId, // Added missing teamId
          specialties: specialties || [],
          experience: experienceLevel || 'JUNIOR',
          availability: availability || 'AVAILABLE',
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
            },
          },
        },
      });

      return teamMember;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to create team member:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}