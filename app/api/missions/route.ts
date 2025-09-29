// app/api/missions/route.ts - FIXED VERSION WITH PROPER TYPING
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';  // Use singleton
import { ExtendedUser } from '@/types/next-auth';
import { MissionStatus, Prisma } from '@prisma/client';

// GET /api/missions - Fetch missions with filters and pagination
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

    console.log('🔵 Fetching missions...');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const statusParam = searchParams.get('status');
    const priority = searchParams.get('priority');
    const teamLeaderId = searchParams.get('teamLeaderId');
    const teamId = searchParams.get('teamId');
    const search = searchParams.get('search');
    const type = searchParams.get('type');

    // Build where clause
    const where: Prisma.MissionWhereInput = {};

    // FIXED: Proper TypeScript handling for status
    if (statusParam) {
      const statusValues = statusParam.split(',').map(s => s.trim()) as MissionStatus[];
      if (statusValues.length === 1) {
        where.status = statusValues[0] as MissionStatus;  // FIXED: explicit cast
      } else if (statusValues.length > 1) {
        where.status = { in: statusValues };  // FIXED: this is correct for arrays
      }
    }

    if (priority) {
      const priorityValues = priority.split(',').map(p => p.trim());
      if (priorityValues.length === 1) {
        where.priority = priorityValues[0] as any;
      } else {
        where.priority = { in: priorityValues as any[] };
      }
    }

    if (teamLeaderId) where.teamLeaderId = teamLeaderId;
    if (teamId) where.teamId = teamId;
    if (type) where.type = type as any;

    if (search && search.trim()) {
      where.OR = [
        { missionNumber: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { lead: { firstName: { contains: search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const offset = (page - 1) * limit;

    console.log('🔧 Query filters:', { where, page, limit });

    // Fetch missions with pagination
    const [missions, total] = await Promise.all([
      prisma.mission.findMany({
        where,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              address: true,
              company: true,
              leadType: true
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
              image: true,
              role: true
            }
          },
          team: {
            select: {
              id: true,
              name: true,
              members: {
                where: { isActive: true },
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                      image: true,
                      role: true
                    }
                  }
                }
              }
            }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              category: true,
              estimatedTime: true,
              actualTime: true
            },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: {
              tasks: true,
              expenses: true,
              qualityChecks: true
            }
          }
        },
        orderBy: [
          { scheduledDate: 'asc' },
          { createdAt: 'desc' }
        ],
        skip: offset,
        take: limit
      }),
      prisma.mission.count({ where })
    ]);

    console.log(`✅ Successfully fetched ${missions.length} missions (total: ${total})`);

    return NextResponse.json({
      missions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('❌ Failed to fetch missions:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// POST /api/missions - Create a new mission
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
    if (!['ADMIN', 'MANAGER', 'AGENT'].includes(user.role || '')) {
      return new NextResponse('Forbidden - Insufficient permissions', { status: 403 });
    }

    console.log('🔵 Creating new mission...');

    const body = await request.json();
    console.log('🔧 Mission data:', body);

    // Basic validation
    const { leadId, scheduledDate, address } = body;

    if (!leadId || !scheduledDate || !address) {
      return NextResponse.json({
        error: 'VALIDATION_ERROR',
        message: 'Missing required fields: leadId, scheduledDate, or address'
      }, { status: 400 });
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return NextResponse.json({
        error: 'LEAD_NOT_FOUND',
        message: 'Lead not found'
      }, { status: 404 });
    }

    // Generate mission number
    const lastMission = await prisma.mission.findFirst({
      orderBy: { missionNumber: 'desc' },
      select: { missionNumber: true }
    });

    const lastNumber = lastMission?.missionNumber 
      ? parseInt(lastMission.missionNumber.replace('MSN-', ''))
      : 0;
    
    const missionNumber = `MSN-${String(lastNumber + 1).padStart(6, '0')}`;

    // Create mission
    const mission = await prisma.mission.create({
      data: {
        missionNumber,
        leadId,
        quoteId: body.quoteId || null,
        teamLeaderId: body.teamLeaderId || null,
        teamId: body.teamId || null,
        scheduledDate: new Date(scheduledDate),
        estimatedDuration: body.estimatedDuration || null,
        address,
        coordinates: body.coordinates || null,
        accessNotes: body.accessNotes || null,
        priority: body.priority || 'NORMAL',
        type: body.type || 'SERVICE',
        status: 'SCHEDULED',
        adminNotes: body.adminNotes || null
      },
      include: {
        lead: true,
        teamLeader: true,
        team: true
      }
    });

    console.log(`✅ Mission created successfully: ${mission.missionNumber}`);

    return NextResponse.json(mission, { status: 201 });

  } catch (error) {
    console.error('❌ Failed to create mission:', error);
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2003') {
        return NextResponse.json({
          error: 'FOREIGN_KEY_ERROR',
          message: 'Invalid reference to lead, quote, team leader, or team'
        }, { status: 400 });
      }
    }
    
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}