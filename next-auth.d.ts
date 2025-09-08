// next-auth.d.ts - FIXED

import { UserRole } from "@prisma/client"
import NextAuth, { type DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt";

// Extend the default user type to include our custom properties
export type ExtendedUser = DefaultSession["user"] & {
  id: string;
  role: UserRole;
};

// Augment the Session module
declare module "next-auth" {
  interface Session {
    // The user object in the session will now have our extended properties
    user: ExtendedUser;
  }
   // Also augment the default User type for consistency
   interface User {
    role: UserRole;
  }
}

// Augment the JWT module to include properties in the token
declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}