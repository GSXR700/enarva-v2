// app/api/team-members/route.ts
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/team-members - Fetch all team members with their user info
export async function GET() {
  try {
    const teamMembers = await prisma.teamMember.findMany({
      include: {
        user: true, // Include the related user data (name, role, etc.)
      },
      orderBy: {
        user: {
            name: 'asc'
        }
      },
    })
    return NextResponse.json(teamMembers)
  } catch (error) {
    console.error('Failed to fetch team members:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// POST /api/team-members - Create a new user and a linked team member
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, name, role, firstName, lastName, phone, specialties, experienceLevel } = body;

        if (!email || !name || !role || !firstName || !lastName || !phone) {
            return new NextResponse('Missing required fields', { status: 400 });
        }

        // Create a User record first, then create a TeamMember linked to it
        const newUser = await prisma.user.create({
            data: {
                email,
                name,
                role,
                teamMember: {
                    create: {
                        firstName,
                        lastName,
                        phone,
                        email,
                        specialties,
                        experienceLevel,
                    }
                }
            },
            include: {
                teamMember: true // Return the created team member as well
            }
        });

        return NextResponse.json(newUser.teamMember, { status: 201 });

    } catch (error: any) {
        if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
             return new NextResponse('A user with this email already exists.', { status: 409 });
        }
        console.error('Failed to create team member:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}