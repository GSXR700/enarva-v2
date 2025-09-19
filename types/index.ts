// types/index.ts
import { Task, Team, TeamMember, User } from '@prisma/client';

export type TeamWithMembers = Team & {
  members: (TeamMember & {
    user: User;
  })[];
};

export type TaskWithId = Task & {
  id: string;
};

export type FullMission = {
  id: string;
  missionNumber: string;
  status: string;
  priority: string;
  type: string;
  scheduledDate: Date;
  estimatedDuration: number;
  address: string;
  lead: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  team: TeamWithMembers | null;
  tasks: TaskWithId[];
  teamLeader: User | null;
  // Add other mission fields as needed
  [key: string]: any;
};