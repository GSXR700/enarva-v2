// app/api/users/route.ts
import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient, UserRole } from '@prisma/client' // Import the UserRole enum

const prisma = new PrismaClient()

// Helper to check if a string is a valid UserRole
function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}

// GET /api/users - Fetch users, optionally filtered by role
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roleParam = searchParams.get('role')

    let whereClause = {};

    if (roleParam) {
      const upperCaseRole = roleParam.toUpperCase();
      // Validate that the provided role is a real UserRole
      if (isValidUserRole(upperCaseRole)) {
        whereClause = { role: upperCaseRole };
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: {
        name: 'asc',
      },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}