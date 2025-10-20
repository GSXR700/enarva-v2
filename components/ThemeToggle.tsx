// components/ThemeToggle.tsx - FIXED TOGGLE DESIGN
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { motion } from 'framer-motion'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-[4.5rem] items-center rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      style={{
        backgroundColor: isDark ? 'rgb(51, 65, 85)' : 'rgb(59, 130, 246)'
      }}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      <motion.div
        className="flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg"
        animate={{
          x: isDark ? 38 : 2,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-slate-700" />
        ) : (
          <Sun className="h-4 w-4 text-yellow-500" />
        )}
      </motion.div>

      <div className="absolute left-2 opacity-0 pointer-events-none">
        <Sun className={`h-4 w-4 transition-opacity duration-300 ${!isDark ? 'opacity-40 text-white' : 'opacity-0'}`} />
      </div>
      <div className="absolute right-2 opacity-0 pointer-events-none">
        <Moon className={`h-4 w-4 transition-opacity duration-300 ${isDark ? 'opacity-40 text-slate-300' : 'opacity-0'}`} />
      </div>
    </motion.button>
  )
}