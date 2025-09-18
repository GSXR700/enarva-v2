// middleware.ts - FIXED
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(req: NextRequest) {
  // Fixed: Ensure NEXTAUTH_SECRET is defined
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    console.error('NEXTAUTH_SECRET is not defined')
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const token = await getToken({ req, secret })

  const { pathname } = req.nextUrl

  // Allow requests to the login page and public assets
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Check role-based access for admin routes
  if (pathname.startsWith('/administration')) {
    const userRole = token.role as string
    const allowedRoles = ['ADMIN', 'MANAGER', 'AGENT', 'TEAM_LEADER']
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/field/dashboard', req.url))
    }
  }

  // Check field access
  if (pathname.startsWith('/field')) {
    const userRole = token.role as string
    const allowedFieldRoles = ['TECHNICIAN', 'TEAM_LEADER']
    
    if (!allowedFieldRoles.includes(userRole)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ],
}