// types/next-auth.d.ts - COMPLETE CORRECTED VERSION
import NextAuth, { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
      teamMember?: any;
    } & DefaultSession['user']
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    image?: string | null;
    teamMember?: any;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: string;
    teamMember?: any;
  }
}

export interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string;
  teamMember?: any;
}