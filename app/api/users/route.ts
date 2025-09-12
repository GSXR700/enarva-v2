// app/api/users/route.ts - VERSION CORRIGÉE
import { NextResponse } from 'next/server'
import { PrismaClient, UserRole, Prisma } from '@prisma/client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import bcrypt from 'bcryptjs'
import { ExtendedUser } from '@/types/next-auth'

const prisma = new PrismaClient()

// GET /api/users - Get all users with pagination and search
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as ExtendedUser).role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') // Filter by specific role

    // Build where clause for filtering
    const where: Prisma.UserWhereInput = {}

    // Add search condition
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Add role filter
    if (role && role !== 'all') {
      if (role === 'TEAM_LEADER') {
        where.role = 'TEAM_LEADER'
      } else if (Object.values(UserRole).includes(role as UserRole)) {
        where.role = role as UserRole
      }
    }

    // Get total count for pagination
    const totalCount = await prisma.user.count({ where })

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        onlineStatus: true,
        lastSeen: true,
        createdAt: true,
        teamMemberships: {
          include: {
            team: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    })

    console.log(`Fetched ${users.length} users for role filter: ${role}`)

    // Always return users as array, not wrapped in data object
    return NextResponse.json(users, {
      headers: {
        'X-Total-Count': totalCount.toString(),
        'X-Page': page.toString(),
        'X-Per-Page': limit.toString(),
        'X-Total-Pages': Math.ceil(totalCount / limit).toString()
      }
    })

  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// POST /api/users - Create a new user
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || (session.user as ExtendedUser).role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { name, email, password, role, teamId } = body

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, password, role' },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role provided' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        role: role as UserRole,
        onlineStatus: 'OFFLINE'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        onlineStatus: true,
        createdAt: true
      }
    })

    console.log(`Created new user: ${newUser.email} with role: ${newUser.role}`)

    return NextResponse.json(newUser, { status: 201 })

  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}