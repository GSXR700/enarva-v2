// app/layout.tsx
import './globals.css'
import { Poppins } from 'next/font/google'
import { Providers } from '@/components/providers/Providers'
import SplashScreen from '@/components/SplashScreen'
import { Metadata, Viewport } from 'next'
import PWAInstaller from '@/components/PWAInstaller';

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0066FF',
}

export const metadata: Metadata = {
  title: 'Enarva OS',
  description: 'Plateforme de gestion complète pour Enarva.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Enarva OS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={poppins.variable} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="theme-color" content="#0066FF" />
      </head>
      <body className="antialiased bg-background font-poppins" suppressHydrationWarning>
        <SplashScreen />
        <Providers>
          {children}
           <PWAInstaller />
        </Providers>
      </body>
    </html>
  )
}