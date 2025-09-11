// middleware.ts
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  // Définition des routes d'administration et de terrain
  const isAdminRoute = pathname.startsWith('/(administration)') || 
                       pathname === '/' ||
                       pathname.startsWith('/leads') ||
                       pathname.startsWith('/quotes') ||
                       pathname.startsWith('/teams') ||
                       pathname.startsWith('/inventory') ||
                       pathname.startsWith('/billing') ||
                       pathname.startsWith('/analytics') ||
                       pathname.startsWith('/expenses') ||
                       pathname.startsWith('/loyalty') ||
                       pathname.startsWith('/settings');

  const isFieldRoute = pathname.startsWith('/(field)') || pathname.startsWith('/dashboard');

  // --- CORRECTION ---
  // Règle plus spécifique pour les routes publiques et d'authentification.
  // Cela garantit que le reste de l'API (comme /api/pusher) est protégé.
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api/auth') || // Ignorer seulement les routes NextAuth
    pathname.startsWith('/api/edgestore') || // Ignorer les routes Edgestore
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  // Si pas de token, redirection vers la page de connexion
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as string;

  // Redirection basée sur le rôle de l'utilisateur
  if ((userRole === 'TECHNICIAN' || userRole === 'TEAM_LEADER') && isAdminRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  if ((userRole === 'ADMIN' || userRole === 'MANAGER') && isFieldRoute) {
     return NextResponse.redirect(new URL('/', req.url));
  }
  
  return NextResponse.next();
}

export const config = { 
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}