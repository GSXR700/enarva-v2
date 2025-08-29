// app/api/analytics/stats/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient()

export async function GET() {
  try {
    const totalLeads = await prisma.lead.count();
    const convertedLeads = await prisma.lead.count({ where: { status: 'COMPLETED' } });
    
    const completedMissions = await prisma.mission.findMany({
        where: { status: 'COMPLETED' },
        include: { quote: true }
    });

    // Fixed: Check if mission.quote exists before accessing finalPrice
    const totalRevenue = completedMissions.reduce((acc, mission) => {
        if (mission.quote) { // Only add to total if quote exists
            return acc.add(mission.quote.finalPrice);
        }
        return acc; // Return accumulator unchanged if no quote
    }, new Decimal(0));

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const stats = {
        totalLeads,
        conversionRate: conversionRate.toFixed(1),
        totalRevenue: totalRevenue.toNumber(),
        completedMissions: completedMissions.length,
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Failed to fetch analytics stats:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}