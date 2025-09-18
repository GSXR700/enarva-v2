// middleware.ts - FIXED ROLE-BASED ROUTING
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

  // Define route patterns more precisely
  const adminRoutes = [
    '/(administration)',
    '/leads',
    '/quotes', 
    '/missions',
    '/teams',
    '/inventory',
    '/billing',
    '/analytics',
    '/expenses',
    '/loyalty',
    '/settings'
  ];

  // Field/Technician routes - these contain "dashboard" or "(field)"
  const fieldRoutes = [
    '/(field)',
    '/dashboard' // This is the field dashboard
  ];

  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
  const isFieldRoute = fieldRoutes.some(route => pathname.startsWith(route));

  // Role-based access control
  if (userRole === 'ADMIN' || userRole === 'MANAGER') {
    // Admins and Managers should use admin interface
    if (isFieldRoute) {
      // Redirect field routes to admin dashboard
      return NextResponse.redirect(new URL('/', req.url));
    }
    // Allow access to admin routes
    return NextResponse.next();
  }

  if (userRole === 'TECHNICIAN' || userRole === 'TEAM_LEADER') {
    // Technicians and Team Leaders should use field interface
    if (isAdminRoute) {
      // Redirect admin routes to field dashboard  
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    // Allow access to field routes
    return NextResponse.next();
  }

  if (userRole === 'AGENT') {
    // Agents can access both, but default to admin interface
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