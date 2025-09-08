import { NextResponse, NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import Pusher from 'pusher';
import { withErrorHandler } from '@/lib/error-handler';
import { missionSchema } from '@/lib/validation';
import { missionService } from '@/services/mission.service';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

const getMissionsHandler = async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const sortBy = searchParams.get('sortBy') || 'scheduledDate';
  const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

  const where: Prisma.MissionWhereInput = {};
  if (searchParams.get('status')) where.status = searchParams.get('status') as any;
  if (searchParams.get('teamLeaderId')) where.teamLeaderId = searchParams.get('teamLeaderId');
  if (searchParams.get('dateFrom') || searchParams.get('dateTo')) {
    where.scheduledDate = {};
    if (searchParams.get('dateFrom')) where.scheduledDate.gte = new Date(searchParams.get('dateFrom')!);
    if (searchParams.get('dateTo')) where.scheduledDate.lte = new Date(searchParams.get('dateTo')!);
  }

  const { missions, totalCount } = await missionService.getMissions(where, page, limit, sortBy, sortOrder);

  return NextResponse.json({
    data: missions,
    pagination: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    }
  });
};

const createMissionHandler = async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const validatedData = missionSchema.parse(body);

  const newMission = await missionService.createMission(validatedData);

  pusher.trigger(`user-${newMission.teamLeaderId}`, 'mission-new', newMission)
    .catch(err => console.error('Pusher notification failed:', err));

  return NextResponse.json(newMission, { status: 201 });
};

export const GET = withErrorHandler(getMissionsHandler);
export const POST = withErrorHandler(createMissionHandler);