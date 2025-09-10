// app/api/users/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient, UserRole, Prisma } from '@prisma/client' // Import de Prisma
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
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const search = searchParams.get('search') || ''

    const where: Prisma.UserWhereInput = search // Typage explicite de la clause where
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}

    const users = await prisma.user.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        onlineStatus: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { leadsAssigned: true, missionsLed: true },
        },
      },
    })

    const total = await prisma.user.count({ where })

    return NextResponse.json({
      users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
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
    const { name, email, password, role } = body

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { message: 'Nom, email, mot de passe et rôle sont requis' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: 'Cet email est déjà utilisé' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword: hashedPassword,
        role: role as UserRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error) {
    console.error('Failed to create user:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}