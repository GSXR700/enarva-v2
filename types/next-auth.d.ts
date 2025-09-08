import type { UserRole } from "@prisma/client"
import type { DefaultSession } from "next-auth"

export type ExtendedUser = DefaultSession["user"] & {
  id: string;
  role: UserRole;
};

declare module "next-auth" {
  interface AuthOptions {
    adapter?: any;
    providers: any[];
    session?: {
      strategy: "jwt" | "database";
    };
    secret?: string;
    pages?: {
      signIn?: string;
      error?: string;
    };
    callbacks?: {
      session?: (params: { session: any; token: any }) => any;
      jwt?: (params: { token: any; user?: any }) => any;
    };
  }
  
  interface Session {
    user: ExtendedUser;
  }
  
  interface User {
    role: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
  }
}