// components/ThemeToggle.tsx - ENHANCED ANIMATED THEME TOGGLE
'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const isDark = theme === 'dark'

  return (
    <motion.button
      onClick={toggleTheme}
      className={cn(
        'relative inline-flex h-10 w-20 items-center rounded-full transition-colors duration-300',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
        isDark ? 'bg-slate-800' : 'bg-blue-500'
      )}
      whileTap={{ scale: 0.95 }}
      aria-label="Toggle theme"
    >
      {/* Toggle Circle */}
      <motion.div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg',
          'transform transition-transform duration-300'
        )}
        animate={{
          x: isDark ? 44 : 4,
        }}
        transition={{
          type: 'spring',
          stiffness: 500,
          damping: 30,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ scale: 0, rotate: -180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 180, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Moon className="h-4 w-4 text-slate-800" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ scale: 0, rotate: 180, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: -180, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Sun className="h-4 w-4 text-yellow-500" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Background Icons */}
      <div className="absolute left-2 flex items-center">
        <Sun className={cn(
          'h-4 w-4 transition-opacity duration-300',
          isDark ? 'opacity-30 text-slate-400' : 'opacity-0'
        )} />
      </div>
      <div className="absolute right-2 flex items-center">
        <Moon className={cn(
          'h-4 w-4 transition-opacity duration-300',
          isDark ? 'opacity-0' : 'opacity-30 text-white'
        )} />
      </div>
    </motion.button>
  )
}