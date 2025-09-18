// lib/auth.ts - CORRECTED FOR NEXTAUTH V4.24.11 + NEXT.JS 15
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: {
              teamMemberships: {
                include: {
                  team: true
                }
              }
            }
          });

          if (!user || !user.hashedPassword) {
            console.log('User not found or no password set');
            return null;
          }

          const isPasswordValid = await bcrypt.compare(credentials.password, user.hashedPassword);
          if (!isPasswordValid) {
            console.log('Invalid password');
            return null;
          }

          // Update last seen
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              lastSeen: new Date(),
              onlineStatus: 'ONLINE'
            }
          });

          console.log('User authenticated successfully:', user.email);

          return {
            id: user.id,
            email: user.email || '',
            name: user.name || '',
            role: user.role,
            image: user.image,
            teamMember: user.teamMemberships
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days,
  },
  callbacks: {
    async jwt({ token, user }) { // Fixed: Remove unused account parameter
      console.log('JWT callback - user:', !!user, 'token sub:', token.sub);
      
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.teamMember = user.teamMember;
      }
      return token;
    },
    async session({ session, token }) {
      console.log('Session callback - token:', { 
        sub: token.sub, 
        id: token.id, 
        role: token.role 
      });
      
      if (token && session.user) {
        // Prioritize token.id over token.sub for consistency
        session.user.id = (token.id as string) || token.sub || '';
        session.user.role = (token.role as string) || '';
        session.user.teamMember = token.teamMember as any;
        
        console.log('Session user ID set to:', session.user.id);
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login'
  },
  debug: process.env.NODE_ENV === 'development',
  // NextAuth v4 compatibility settings
  useSecureCookies: process.env.NODE_ENV === 'production',
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
};