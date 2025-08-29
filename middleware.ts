// middleware.ts
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

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

  // Allow access to public pages, API routes, and static files
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('/favicon.ico') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  // If there's no token, redirect all protected routes to login
  if (!token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.url);
    return NextResponse.redirect(loginUrl);
  }

  // --- ROLE-BASED ACCESS LOGIC ---
  const userRole = token.role as string;

  // If a field user (Technician/Team Leader) tries to access an admin route...
  if ((userRole === 'TECHNICIAN' || userRole === 'TEAM_LEADER') && isAdminRoute) {
    // ...redirect them to their own dashboard.
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  
  // If an admin/manager tries to access the field dashboard root...
  if ((userRole === 'ADMIN' || userRole === 'MANAGER') && isFieldRoute) {
     // ...redirect them to the main admin dashboard.
     return NextResponse.redirect(new URL('/', req.url));
  }
  
  // If the user is authenticated and has the correct role, allow the request
  return NextResponse.next();
}

export const config = { 
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}