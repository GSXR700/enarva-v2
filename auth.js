// auth.ts - NEXT.JS 15 COMPATIBLE (renamed from auth.js to auth.ts)
import NextAuth from "next-auth"
import { authOptions } from "./lib/auth"

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)