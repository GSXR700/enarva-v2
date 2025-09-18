// gsxr700/enarva-v2/enarva-v2-6ca61289d3a555c270f0a2db9f078e282ccd8664/app/api/dashboard/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, LeadStatus } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const today = new Date();
    const startOfCurrentMonth = startOfMonth(today);
    const endOfCurrentMonth = endOfMonth(today); // Using endOfMonth

    // Stats
    const totalLeads = await prisma.lead.count({
        where: { status: { notIn: [LeadStatus.LEAD_LOST, LeadStatus.COMPLETED]}}
    });
    
    const activeMissionsCount = await prisma.mission.count({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } }
    });

    const completedMissionsThisMonth = await prisma.mission.findMany({
        where: {
            status: 'COMPLETED',
            // Use the full month range
            updatedAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        },
        include: { quote: true }
    });

    const totalRevenue = completedMissionsThisMonth.reduce((sum, mission) => {
        return sum + (mission.quote?.finalPrice.toNumber() || 0);
    }, 0);

    const leadsWonThisMonth = await prisma.lead.count({
        where: {
            status: LeadStatus.QUOTE_ACCEPTED,
            // Use the full month range
            updatedAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        }
    });
    const totalLeadsThisMonth = await prisma.lead.count({
        where: {
            // Use the full month range
            createdAt: { gte: startOfCurrentMonth, lte: endOfCurrentMonth }
        }
    });

    const conversionRate = totalLeadsThisMonth > 0 
        ? ((leadsWonThisMonth / totalLeadsThisMonth) * 100).toFixed(1)
        : "0.0";
    
    // Recent Leads
    const recentLeads = await prisma.lead.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: true }
    });

    // Active Missions
    const activeMissions = await prisma.mission.findMany({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      include: { 
        lead: { select: { firstName: true, lastName: true, address: true } },
        // ✅ FIX: Ensure tasks are always included with a minimal selection
        tasks: { select: { id: true, status: true } }
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });
    
    const data = {
        stats: {
            totalLeads,
            activeMissions: activeMissionsCount,
            totalRevenue,
            conversionRate
        },
        recentLeads,
        activeMissions,
    };

    return NextResponse.json(data);

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}