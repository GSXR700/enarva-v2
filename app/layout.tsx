// app/layout.tsx
import './globals.css'
import { Poppins } from 'next/font/google'
import { Providers } from '@/components/providers/Providers'

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const metadata = {
  title: 'Enarva OS',
  description: 'Plateforme de gestion complète pour Enarva.',
  // --- LIGNE AJOUTÉE POUR LE FAVICON ---
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={poppins.variable} suppressHydrationWarning>
      <body className="antialiased bg-background font-poppins" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}