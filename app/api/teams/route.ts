// app/api/teams/route.ts - API COMPLÈTE POUR LA GESTION DES ÉQUIPES
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { ExtendedUser } from '@/types/next-auth';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation schema pour la création d'équipe
const createTeamSchema = z.object({
  name: z.string().min(2, 'Le nom de l\'équipe doit contenir au moins 2 caractères'),
  description: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional().default([]), // IDs des utilisateurs à ajouter
});

// Validation schema pour la mise à jour d'équipe
const updateTeamSchema = z.object({
  name: z.string().min(2, 'Le nom de l\'équipe doit contenir au moins 2 caractères').optional(),
  description: z.string().optional().nullable(),
  memberIds: z.array(z.string()).optional(), // IDs des utilisateurs à ajouter/retirer
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const includeMembers = searchParams.get('includeMembers') === 'true';

    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get total count for pagination
    const total = await prisma.team.count({ where });

    // Fetch teams with comprehensive data
    const teams = await prisma.team.findMany({
      where,
      skip,
      take: limit,
      include: {
        members: {
          where: { isActive: true },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                image: true,
                onlineStatus: true,
                lastSeen: true
              }
            }
          },
          orderBy: [
            { user: { role: 'desc' } }, // Team leaders first
            { joinedAt: 'asc' }
          ]
        },
        missions: includeMembers ? {
          select: {
            id: true,
            missionNumber: true,
            status: true,
            scheduledDate: true
          },
          orderBy: { scheduledDate: 'desc' },
          take: 5 // Last 5 missions
        } : false,
        _count: {
          select: {
            members: { where: { isActive: true } },
            missions: true
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' }
      ]
    });

    // Enhance teams with computed data
    const enhancedTeams = teams.map(team => {
      const teamLeader = team.members.find(member => member.user.role === 'TEAM_LEADER');
      const activeMembers = team.members.filter(member => member.isActive);
      const availableMembers = team.members.filter(member => 
        member.isActive && member.availability === 'AVAILABLE'
      );

      return {
        ...team,
        teamLeader: teamLeader ? {
          id: teamLeader.user.id,
          name: teamLeader.user.name,
          email: teamLeader.user.email,
          onlineStatus: teamLeader.user.onlineStatus,
          availability: teamLeader.availability
        } : null,
        stats: {
          totalMembers: activeMembers.length,
          availableMembers: availableMembers.length,
          completedMissions: team._count.missions,
          activeMembers: activeMembers.length,
          inactiveMembers: team.members.length - activeMembers.length
        },
        membersSummary: activeMembers.map(member => ({
          id: member.id,
          userId: member.user.id,
          name: member.user.name,
          role: member.user.role,
          availability: member.availability,
          specialties: member.specialties,
          experience: member.experience
        }))
      };
    });

    return NextResponse.json({
      teams: enhancedTeams,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Failed to fetch teams:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    // Only admins and managers can create teams
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await request.json();
    console.log('Creating team with data:', body);

    // Validate input
    const validationResult = createTeamSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation errors:', validationResult.error.errors);
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Create team in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if team name already exists
      const existingTeam = await tx.team.findUnique({
        where: { name: validatedData.name }
      });

      if (existingTeam) {
        throw new Error('Une équipe avec ce nom existe déjà');
      }

      // Validate all member IDs if provided
      if (validatedData.memberIds.length > 0) {
        const users = await tx.user.findMany({
          where: { id: { in: validatedData.memberIds } }
        });

        if (users.length !== validatedData.memberIds.length) {
          throw new Error('Certains utilisateurs spécifiés n\'existent pas');
        }

        // Check if any users are already in active teams
        const existingMemberships = await tx.teamMember.findMany({
          where: {
            userId: { in: validatedData.memberIds },
            isActive: true
          },
          include: {
            team: { select: { name: true } },
            user: { select: { name: true } }
          }
        });

        if (existingMemberships.length > 0) {
          const conflicts = existingMemberships.map(m => 
            `${m.user.name} (déjà dans ${m.team.name})`
          ).join(', ');
          throw new Error(`Ces utilisateurs sont déjà dans des équipes actives: ${conflicts}`);
        }
      }

      // Create the team
      const newTeam = await tx.team.create({
        data: {
          name: validatedData.name,
          description: validatedData.description ?? null
        }
      });

      // Add members to team if provided
      if (validatedData.memberIds.length > 0) {
        const teamMembersData = validatedData.memberIds.map(userId => ({
          userId,
          teamId: newTeam.id,
          isActive: true,
          availability: 'AVAILABLE' as const,
          experience: 'JUNIOR' as const,
          specialties: []
        }));

        await tx.teamMember.createMany({
          data: teamMembersData
        });
      }

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Using valid enum value for team creation
          title: 'Équipe créée',
          description: `Équipe "${validatedData.name}" créée avec ${validatedData.memberIds.length} membre(s)`,
          userId: user.id,
          metadata: {
            teamId: newTeam.id,
            teamName: validatedData.name,
            membersCount: validatedData.memberIds.length,
            memberIds: validatedData.memberIds
          }
        }
      });

      // Return team with members
      return await tx.team.findUnique({
        where: { id: newTeam.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  image: true
                }
              }
            }
          }
        }
      });
    });

    console.log('Team created successfully:', result);
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Failed to create team:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('équipe avec ce nom existe déjà')) {
      return NextResponse.json(
        { 
          error: 'Nom d\'équipe déjà utilisé', 
          details: 'Une équipe avec ce nom existe déjà.',
          suggestion: 'Choisissez un nom différent pour votre équipe.'
        },
        { status: 409 }
      );
    }

    if (errorMessage.includes('déjà dans des équipes actives')) {
      return NextResponse.json(
        { 
          error: 'Membres déjà assignés', 
          details: errorMessage,
          suggestion: 'Retirez ces membres de leurs équipes actuelles ou choisissez d\'autres membres.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create team', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('id');
    
    if (!teamId) {
      return new NextResponse('Team ID required', { status: 400 });
    }

    const body = await request.json();

    // Validate input
    const validationResult = updateTeamSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    const updatedTeam = await prisma.$transaction(async (tx) => {
      // Check if team exists
      const existingTeam = await tx.team.findUnique({
        where: { id: teamId },
        include: {
          members: {
            include: {
              user: { select: { name: true } }
            }
          }
        }
      });

      if (!existingTeam) {
        throw new Error('Team not found');
      }

      // Update team information
      const updateData: any = {};
      if (validatedData.name) updateData.name = validatedData.name;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;

      const updated = await tx.team.update({
        where: { id: teamId },
        data: updateData,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                  image: true
                }
              }
            }
          }
        }
      });

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'LEAD_CREATED', // Using valid enum value
          title: 'Équipe mise à jour',
          description: `Équipe "${existingTeam.name}" mise à jour`,
          userId: user.id,
          metadata: {
            teamId: existingTeam.id,
            oldName: existingTeam.name,
            newName: validatedData.name || existingTeam.name,
            changes: Object.keys(updateData)
          }
        }
      });

      return updated;
    });

    return NextResponse.json(updatedTeam);

  } catch (error) {
    console.error('Failed to update team:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Team not found')) {
      return new NextResponse('Team not found', { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to update team', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const user = session.user as ExtendedUser;
    if (!user.id) {
      return new NextResponse('User ID missing', { status: 401 });
    }

    // Only admins can delete teams
    if (user.role !== 'ADMIN') {
      return new NextResponse('Forbidden - Admin access required', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('id');
    
    if (!teamId) {
      return new NextResponse('Team ID required', { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Check if team exists and get info
      const team = await tx.team.findUnique({
        where: { id: teamId },
        include: {
          members: true,
          missions: { select: { id: true, missionNumber: true } }
        }
      });

      if (!team) {
        throw new Error('Team not found');
      }

      // Check if team has active missions
      if (team.missions.length > 0) {
        throw new Error(`Cannot delete team with ${team.missions.length} associated missions. Please reassign or complete missions first.`);
      }

      // Deactivate all team members instead of deleting them
      await tx.teamMember.updateMany({
        where: { teamId },
        data: { isActive: false }
      });

      // Delete the team
      await tx.team.delete({ where: { id: teamId } });

      // Log the deletion
      await tx.activity.create({
        data: {
          type: 'SYSTEM_MAINTENANCE',
          title: 'Équipe supprimée',
          description: `Équipe "${team.name}" supprimée avec ${team.members.length} membre(s)`,
          userId: user.id,
          metadata: { 
            deletedTeamId: teamId,
            teamName: team.name,
            membersCount: team.members.length,
            deletedBy: user.name
          }
        }
      });
    });

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Failed to delete team:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    if (errorMessage.includes('Team not found')) {
      return new NextResponse('Team not found', { status: 404 });
    }

    if (errorMessage.includes('Cannot delete team with')) {
      return NextResponse.json(
        { 
          error: 'Team has active missions', 
          details: errorMessage,
          suggestion: 'Please reassign or complete all missions before deleting the team.'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete team', details: errorMessage },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}