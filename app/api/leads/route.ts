// app/api/leads/route.ts - REFACTORED TO USE LEAD SERVICE
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { leadSchema } from '@/lib/validation';
import { rateLimiters, createRateLimitResponse } from '@/lib/rate-limit';
import { leadService } from '@/services/lead.service'; // <-- IMPORT THE SERVICE
import Pusher from 'pusher';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true
});

/**
 * GET /api/leads
 * Fetches a paginated and filtered list of leads.
 */
export async function GET(req: NextRequest) {
  const rateLimitResult = await rateLimiters.read.check(req);
  if (!rateLimitResult.success) {
  return createRateLimitResponse(rateLimitResult);
  }

  try {
   const session = await getServerSession(authOptions);
   if (!session) {
     return new NextResponse('Unauthorized', { status: 401 });
   }

     const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');
    const assignedToId = searchParams.get('assignedToId');
    const leadType = searchParams.get('leadType');
    const channel = searchParams.get('channel');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    const where: Prisma.LeadWhereInput = {};
    if (status) where.status = status as any;
    if (assignedToId) where.assignedToId = assignedToId;
    if (leadType) where.leadType = leadType as any;
    if (channel) where.channel = channel as any;
    if (search) {
       where.OR = [
         { firstName: { contains: search, mode: 'insensitive' } },
         { lastName: { contains: search, mode: 'insensitive' } },
         { email: { contains: search, mode: 'insensitive' } },
         { phone: { contains: search } },
         { company: { contains: search, mode: 'insensitive' } },];
         }

    // <-- DELEGATE TO THE SERVICE
   const { leads, totalCount } = await leadService.getLeads(where, page, limit, sortBy, sortOrder);

    const response = NextResponse.json({
      data: leads,
       pagination: {
        total: totalCount,
         page,
         limit,
         totalPages: Math.ceil(totalCount / limit),
          },
     }, {
       headers: {
          'X-Total-Count': totalCount.toString(),
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
  }
 });

     return response;
 } catch (error) {
    console.error('Error fetching leads:', error);
   return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
}
}

/**
 * POST /api/leads
 * Creates a new lead.
 */
export async function POST(req: NextRequest) {
  const rateLimitResult = await rateLimiters.write.check(req);
  if (!rateLimitResult.success) {
   return createRateLimitResponse(rateLimitResult);
   }

     try {
     const session = await getServerSession(authOptions);
      if (!session) {
     return new NextResponse('Unauthorized', { status: 401 });
     }

     const body = await req.json();
     const validationResult = leadSchema.safeParse(body);

     if (!validationResult.success) {
       return NextResponse.json({
         error: 'Validation failed',
       details: validationResult.error.flatten().fieldErrors,
  }, { status: 400 });
  }

    // <-- DELEGATE TO THE SERVICE
     const newLead = await leadService.createLead(validationResult.data, session.user.id);

   // Non-blocking notifications
        Promise.all([
      newLead.assignedToId && pusher.trigger(`user-${newLead.assignedToId}`, 'new-lead-assigned', newLead),
        pusher.trigger('leads-channel', 'new-lead', newLead),
    ]).catch(err => console.error('Pusher notification failed:', err));

     return NextResponse.json(newLead, {
       status: 201,
        headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.reset).toISOString(),
        }
        });

          } catch (error) {
          console.error('Error creating lead:', error);
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              return NextResponse.json({ error: 'A lead with this email or phone already exists' }, { status: 409 });
          }
              return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
          }
}