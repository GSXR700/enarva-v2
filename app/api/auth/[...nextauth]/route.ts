import { authOptions } from '@/lib/auth'

async function handler(req: Request) {
  // @ts-ignore - NextAuth type issue in Next.js 15
  const NextAuth = require('next-auth').default || require('next-auth')
  return NextAuth(authOptions)(req)
}

export { handler as GET, handler as POST }