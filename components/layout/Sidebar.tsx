// components/layout/Sidebar.tsx - FIXED DESKTOP VISIBILITY
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  FileText,
  DollarSign,
  Settings,
  BarChart3,
  Package,
  Calendar,
  MessageSquare,
  ClipboardCheck,
  TrendingDown,
  CreditCard,
  Activity,
  AlertTriangle,
  FileBarChart,
  CalendarDays,
  UserCheck,
  TrendingUp
} from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'

const navigation = [
  {
    name: 'Tableau de Bord',
    href: '/dashboard',
    icon: BarChart3,
    category: 'principal'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: TrendingUp,
    category: 'principal'
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users,
    category: 'ventes'
  },
  {
    name: 'Devis',
    href: '/quotes',
    icon: FileText,
    category: 'ventes'
  },
  {
    name: 'Missions',
    href: '/missions',
    icon: Calendar,
    category: 'operations'
  },
  {
    name: 'Planning',
    href: '/planning',
    icon: CalendarDays,
    category: 'operations'
  },
  {
    name: 'Équipes',
    href: '/teams',
    icon: Users,
    category: 'operations'
  },
  {
    name: 'Contrôles Qualité',
    href: '/quality-checks',
    icon: ClipboardCheck,
    category: 'qualite'
  },
  {
    name: 'Validation Missions',
    href: '/missions/validation',
    icon: UserCheck,
    category: 'qualite'
  },
  {
    name: 'Rapports Terrain',
    href: '/field-reports',
    icon: FileBarChart,
    category: 'qualite'
  },
  {
    name: 'Facturation',
    href: '/billing',
    icon: DollarSign,
    category: 'finance'
  },
  {
    name: 'Dépenses',
    href: '/expenses',
    icon: DollarSign,
    category: 'finance'
  },
  {
    name: 'Abonnements',
    href: '/subscriptions',
    icon: CreditCard,
    category: 'finance'
  },
  {
    name: 'Inventaire',
    href: '/inventory',
    icon: Package,
    category: 'ressources'
  },
  {
    name: 'Utilisation Inventaire',
    href: '/inventory-usage',
    icon: TrendingDown,
    category: 'ressources'
  },
  {
    name: 'Messages',
    href: '/chat',
    icon: MessageSquare,
    category: 'communication'
  },
  {
    name: 'Activités',
    href: '/activities',
    icon: Activity,
    category: 'systeme'
  },
  {
    name: 'Logs Système',
    href: '/system-logs',
    icon: AlertTriangle,
    category: 'systeme'
  },
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
    category: 'systeme'
  },
]

const categories: Record<string, string> = {
  principal: 'Principal',
  ventes: 'Ventes & Leads',
  operations: 'Opérations',
  qualite: 'Qualité',
  finance: 'Finance',
  ressources: 'Ressources',
  communication: 'Communication',
  systeme: 'Système'
}

interface SidebarProps {
  isOpen: boolean
  setOpen: Dispatch<SetStateAction<boolean>>
}

export function Sidebar({ isOpen, setOpen }: SidebarProps) {
  const pathname = usePathname()
  const { theme } = useTheme()

  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setOpen])

  const logoSrc = theme === 'dark' ? '/images/dark-logo.png' : '/images/light-logo.png'

  const handleLinkClick = () => {
    setOpen(false)
  }

  const groupedNav = navigation.reduce((acc, item) => {
    const category = item.category || 'autres'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {} as Record<string, typeof navigation>)

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 md:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72',
          'bg-background/95 backdrop-blur-xl',
          'border-r border-border/50',
          'shadow-2xl shadow-black/5',
          'flex flex-col',
          'dark:bg-black/95 dark:border-border/30',
          'supports-[backdrop-filter]:bg-background/80',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
          'md:translate-x-0 md:static'
        )}
      >
        <div className="h-16 flex items-center justify-center px-6 border-b border-border/50 flex-shrink-0 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Image
              src={logoSrc}
              alt="Enarva OS"
              width={130}
              height={42}
              className="object-contain"
              priority
            />
          </motion.div>
        </div>

        <nav className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {Object.entries(groupedNav).map(([categoryKey, items]) => (
              <div key={categoryKey}>
                <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">
                  {categories[categoryKey] || categoryKey}
                </h3>
                
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={handleLinkClick}
                      >
                        <motion.div
                          whileHover={{ scale: 1.02, x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                          className={cn(
                            'group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl',
                            'transition-all duration-200 ease-out',
                            'relative overflow-hidden',
                            isActive
                              ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                              : 'text-foreground/70 hover:text-foreground hover:bg-accent/50',
                            'cursor-pointer',
                            isActive && 'ring-1 ring-primary/20'
                          )}
                        >
                          {!isActive && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
                              initial={{ x: '-100%' }}
                              whileHover={{ x: '100%' }}
                              transition={{ duration: 0.6 }}
                            />
                          )}
                          
                          <item.icon
                            className={cn(
                              'mr-3 h-5 w-5 flex-shrink-0 transition-all duration-200',
                              isActive
                                ? 'text-primary-foreground drop-shadow-sm'
                                : 'text-foreground/60 group-hover:text-foreground group-hover:scale-110'
                            )}
                          />
                          <span className={cn(
                            'truncate transition-all duration-200',
                            isActive ? 'font-semibold' : 'font-medium'
                          )}>
                            {item.name}
                          </span>

                          {isActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="absolute right-2 w-1.5 h-1.5 bg-primary-foreground rounded-full"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-border/50 flex-shrink-0 backdrop-blur-xl">
          <div className="text-xs text-muted-foreground/60 text-center font-medium">
            © 2025 Enarva OS
          </div>
        </div>
      </aside>
    </>
  )
}