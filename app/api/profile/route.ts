// app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { withErrorHandler } from '@/lib/error-handler';
import { ExtendedUser } from '@/types/next-auth';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function handleProfileGet(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = session.user as ExtendedUser;
  if (!user.id) {
    return NextResponse.json({ error: 'ID utilisateur manquant' }, { status: 401 });
  }

  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        onlineStatus: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        teamMemberships: {
          select: {
            id: true,
            specialties: true,
            experience: true,
            availability: true,
            hourlyRate: true,
            joinedAt: true,
            isActive: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Erreur lors de la récupération du profil' }, { status: 500 });
  }
}

async function handleProfileUpdate(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const user = session.user as ExtendedUser;
  if (!user.id) {
    return NextResponse.json({ error: 'ID utilisateur manquant' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, image, currentPassword, newPassword } = body;

    console.log('Profile update request:', { userId: user.id, updates: Object.keys(body) });

    // Verify user exists first
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        hashedPassword: true,
        role: true
      }
    });

    if (!existingUser) {
      console.error(`User with ID ${user.id} not found in database`);
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const updateData: any = {};

    // Update name if provided
    if (name && name !== existingUser.name) {
      updateData.name = name.trim();
    }

    // Update email if provided and different
    if (email && email !== existingUser.email) {
      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email: email,
          NOT: { id: user.id }
        }
      });

      if (emailExists) {
        return NextResponse.json({ error: 'Cette adresse email est déjà utilisée' }, { status: 400 });
      }

      updateData.email = email.trim().toLowerCase();
    }

    // Update image if provided
    if (image !== undefined) {
      updateData.image = image;
    }

    // Handle password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Mot de passe actuel requis' }, { status: 400 });
      }

      // Verify current password
      if (existingUser.hashedPassword) {
        const isValidPassword = await bcrypt.compare(currentPassword, existingUser.hashedPassword);
        if (!isValidPassword) {
          return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
        }
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      updateData.hashedPassword = hashedPassword;
    }

    // If no updates, return current user
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(existingUser);
    }

    // Add update timestamp
    updateData.updatedAt = new Date();

    console.log('Updating user with data:', Object.keys(updateData));

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        onlineStatus: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
        teamMemberships: {
          select: {
            id: true,
            specialties: true,
            experience: true,
            availability: true,
            hourlyRate: true,
            joinedAt: true,
            isActive: true,
            team: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        }
      }
    });

    console.log('User updated successfully');

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    if (error instanceof Error && error.message.includes('P2025')) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du profil' }, { status: 500 });
  }
}

export const GET = withErrorHandler(handleProfileGet);
export const PUT = withErrorHandler(handleProfileUpdate);
export const PATCH = withErrorHandler(handleProfileUpdate);