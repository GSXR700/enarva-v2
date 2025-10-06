// app/(field)/layout.tsx
'use client'

import { TopBar } from '@/components/layout/TopBar'
import { Toaster } from '@/components/ui/sonner'
import { SessionProvider } from 'next-auth/react'
import { FieldLanguageProvider } from '@/contexts/FieldLanguageContext'

export default function FieldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <FieldLanguageProvider>
        <div className="flex h-screen bg-secondary">
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar onMenuClick={() => {}} />
            <main className="flex-1 overflow-y-auto custom-scrollbar bg-secondary">
              {children}
            </main>
          </div>
          <Toaster position="bottom-center" />
        </div>
      </FieldLanguageProvider>
    </SessionProvider>
  );
}