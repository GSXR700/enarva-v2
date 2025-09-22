// types/team-member.ts - Enhanced type definitions to handle Prisma strict typing
import { Prisma, TeamSpecialty, ExperienceLevel, TeamAvailability } from '@prisma/client';

// Enhanced type for team member creation that handles exactOptionalPropertyTypes
export interface TeamMemberCreateData {
  userId: string;
  teamId: string;
  specialties: TeamSpecialty[];
  experience: ExperienceLevel;
  availability: TeamAvailability;
  hourlyRate?: number | null; // Explicitly allow both undefined and null
  isActive: boolean;
  joinedAt?: Date;
}

// Type-safe helper function for creating team members
export function createTeamMemberData(input: {
  userId: string;
  teamId: string;
  specialties?: TeamSpecialty[];
  experience?: ExperienceLevel;
  availability?: TeamAvailability;
  hourlyRate?: number | null;
  isActive?: boolean;
}): Prisma.TeamMemberCreateInput {
  return {
    user: { connect: { id: input.userId } },
    team: { connect: { id: input.teamId } },
    specialties: input.specialties || [],
    experience: input.experience || 'JUNIOR',
    availability: input.availability || 'AVAILABLE',
    hourlyRate: input.hourlyRate ?? null, // Convert undefined to null
    isActive: input.isActive ?? true,
    joinedAt: new Date()
  };
}

// Type-safe helper for unchecked team member creation (faster)
export function createTeamMemberUncheckedData(input: {
  userId: string;
  teamId: string;
  specialties?: TeamSpecialty[];
  experience?: ExperienceLevel;
  availability?: TeamAvailability;
  hourlyRate?: number | null;
  isActive?: boolean;
}): Prisma.TeamMemberUncheckedCreateInput {
  return {
    userId: input.userId,
    teamId: input.teamId,
    specialties: input.specialties || [],
    experience: input.experience || 'JUNIOR',
    availability: input.availability || 'AVAILABLE',
    hourlyRate: input.hourlyRate ?? null, // Convert undefined to null
    isActive: input.isActive ?? true,
    joinedAt: new Date()
  };
}