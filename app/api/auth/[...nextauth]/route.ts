// @ts-ignore - NextAuth type issue in Next.js 15
const NextAuth = require('next-auth').default || require('next-auth')
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }