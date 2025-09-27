// components/providers/Providers.tsx
'use client'

import { createContext, useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { EdgeStoreProvider } from '@/lib/edgestore'

// --- ThemeProvider Logic ---
type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'enarva-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    root.classList.add(effectiveTheme);
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey, mounted])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme);
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

// --- Main Providers Component ---
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <EdgeStoreProvider>
        <ThemeProvider defaultTheme="light" storageKey="enarva-theme">
          {children}
        </ThemeProvider>
      </EdgeStoreProvider>
    </SessionProvider>
  )
}