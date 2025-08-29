// app/(field)/layout.tsx
'use client'

import { TopBar } from '@/components/layout/TopBar'
import { Toaster } from '@/components/ui/sonner'
import { SessionProvider } from 'next-auth/react'


export default function FieldLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // SessionProvider is needed here if it's not in the root layout
    <SessionProvider>
        <div className="flex h-screen bg-secondary">
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* The TopBar is responsive and will work well here. */}
                {/* We pass an empty function because there's no sidebar to open. */}
                <TopBar onMenuClick={() => {}} />
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-secondary">
                {children}
                </main>
            </div>
            <Toaster position="bottom-center" />
        </div>
    </SessionProvider>
  );
}