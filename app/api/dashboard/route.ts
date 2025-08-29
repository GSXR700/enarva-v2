// app/api/dashboard/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient()

export async function GET() {
  try {
    // 1. Fetch Key Statistics
    const totalLeads = await prisma.lead.count();
    const activeMissionsCount = await prisma.mission.count({ where: { status: 'IN_PROGRESS' } });
    
    const completedMissions = await prisma.mission.findMany({
        where: { status: 'COMPLETED' },
        include: { quote: true }
    });
    
    // Fixed: Check if mission.quote exists before accessing finalPrice
    const totalRevenue = completedMissions.reduce((acc, mission) => {
        if (mission.quote) { // Check if mission.quote is not null
            return acc.add(mission.quote.finalPrice);
        }
        return acc; // Return accumulator unchanged if no quote
    }, new Decimal(0));
    
    const acceptedQuotes = await prisma.quote.count({ where: { status: 'ACCEPTED' } });
    const totalQuotes = await prisma.quote.count();
    const conversionRate = totalQuotes > 0 ? (acceptedQuotes / totalQuotes) * 100 : 0;

    // 2. Fetch Recent Leads
    const recentLeads = await prisma.lead.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
    });

    // 3. Fetch Active Missions
    const activeMissions = await prisma.mission.findMany({
        where: { status: 'IN_PROGRESS' },
        include: { lead: true, teamLeader: true },
        take: 3,
        orderBy: { scheduledDate: 'desc' }
    });

    const dashboardData = {
        stats: {
            totalLeads,
            activeMissions: activeMissionsCount,
            totalRevenue: totalRevenue.toNumber(),
            conversionRate: conversionRate.toFixed(1)
        },
        recentLeads,
        activeMissions,
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}