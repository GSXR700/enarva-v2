// middleware.ts - FIXED ROLE-BASED ROUTING WITH MISSION ACCESS
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, ...(process.env.NEXTAUTH_SECRET ? { secret: process.env.NEXTAUTH_SECRET } : {}) });
  const { pathname } = req.nextUrl;

  // Routes that should be excluded from authentication
  const publicRoutes = [
    '/login',
    '/signup', 
    '/forgot-password',
    '/api/auth',
    '/api/edgestore',
    '/api/leads/ingest',
    '/_next',
    '/favicon.ico',
    '/images'
  ];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as string;

  // Routes that ALL authenticated users can access
  const sharedRoutes = [
    '/api/', // All API routes
    '/missions', // Mission routes - accessible by field workers
    '/profile',
    '/help',
    '/field-reports'
  ];

  // Admin-only routes
  const adminOnlyRoutes = [
    '/(administration)',
    '/leads',
    '/quotes/new',
    '/quotes/edit',
    '/teams/new',
    '/teams/edit',
    '/inventory',
    '/billing',
    '/analytics',
    '/expenses',
    '/loyalty',
    '/settings'
  ];

  // Field-specific routes (dashboard, field reports, etc)
  const fieldRoutes = [
    '/(field)',
    '/dashboard' // This is the field dashboard
  ];

  // Check if current route is shared (accessible by everyone)
  const isSharedRoute = sharedRoutes.some(route => pathname.startsWith(route));
  if (isSharedRoute) {
    return NextResponse.next();
  }

  // Check route types
  const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
  const isFieldRoute = fieldRoutes.some(route => pathname.startsWith(route));

  // Role-based access control
  if (userRole === 'ADMIN' || userRole === 'MANAGER') {
    // Admins and Managers can access admin routes but get redirected from field routes
    if (isFieldRoute) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  if (userRole === 'TECHNICIAN' || userRole === 'TEAM_LEADER') {
    // Field workers can access field routes and shared routes but not admin-only routes
    if (isAdminOnlyRoute) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  }

  if (userRole === 'AGENT') {
    // Agents can access everything
    return NextResponse.next();
  }

  // Default: allow access
  return NextResponse.next();
}

export const config = { 
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};