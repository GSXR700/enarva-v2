import NextAuth from "next-auth"
import { authOptions } from "./lib/auth.ts"

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)