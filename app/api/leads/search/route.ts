// app/api/leads/search/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          {
            firstName: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            company: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            email: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        email: true,
        phone: true,
        leadType: true,
        address: true,
        propertyType: true,
        estimatedSurface: true,
        serviceType: true,
        iceNumber: true,
        activitySector: true,
        contactPosition: true,
        urgencyLevel: true,
        budgetRange: true,
        accessibility: true,
        status: true,
        createdAt: true
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 10
    })

    const transformedLeads = leads.map(lead => ({
      ...lead,
      displayName: lead.company 
        ? `${lead.firstName} ${lead.lastName} (${lead.company})`
        : `${lead.firstName} ${lead.lastName}`,
      typeLabel: lead.leadType === 'PARTICULIER' ? 'Particulier' : 'Professionnel'
    }))

    return NextResponse.json(transformedLeads)
  } catch (error) {
    console.error('Failed to search leads:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}