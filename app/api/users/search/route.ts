// app/api/users/search/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/users/search?q=... - Search for users by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([], { status: 200 }); // Return empty if no query
    }

    const users = await prisma.user.findMany({
      where: {
        name: {
          contains: query,
          mode: 'insensitive', // Case-insensitive search
        },
      },
      take: 10, // Limit results for performance
      select: { // Only select the fields we need
        id: true,
        name: true,
        email: true,
        image: true,
      }
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Failed to search users:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}