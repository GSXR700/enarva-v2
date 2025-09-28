// components/layout/Sidebar.tsx - UPDATED WITH QUALITY CHECKS
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'
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
  UserCheck
} from 'lucide-react'
import { Dispatch, SetStateAction } from 'react'

const navigation = [
  {
    name: 'Tableau de Bord',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    name: 'Leads',
    href: '/leads',
    icon: Users,
  },
  {
    name: 'Devis',
    href: '/quotes',
    icon: FileText,
  },
  {
    name: 'Missions',
    href: '/missions',
    icon: Calendar,
  },
  {
    name: 'Planning',
    href: '/planning',
    icon: CalendarDays,
  },
  {
    name: 'Équipes',
    href: '/teams',
    icon: Users,
  },
  {
    name: 'Contrôles Qualité',
    href: '/quality-checks',
    icon: ClipboardCheck,
  },
  {
    name: 'Validation Missions',
    href: '/missions/validation',
    icon: UserCheck,
  },
  {
    name: 'Facturation',
    href: '/billing',
    icon: DollarSign,
  },
  {
    name: 'Dépenses',
    href: '/expenses',
    icon: DollarSign,
  },
  {
    name: 'Inventaire',
    href: '/inventory',
    icon: Package,
  },
  {
    name: 'Utilisation Inventaire',
    href: '/inventory-usage',
    icon: TrendingDown,
  },
  {
    name: 'Abonnements',
    href: '/subscriptions',
    icon: CreditCard,
  },
  {
    name: 'Rapports Terrain',
    href: '/field-reports',
    icon: FileBarChart,
  },
  {
    name: 'Messages',
    href: '/chat',
    icon: MessageSquare,
  },
  {
    name: 'Activités',
    href: '/activities',
    icon: Activity,
  },
  {
    name: 'Logs Système',
    href: '/system-logs',
    icon: AlertTriangle,
  },
  {
    name: 'Paramètres',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps {
  isOpen: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

export function Sidebar({ isOpen, setOpen }: SidebarProps) {
  const pathname = usePathname()
  const { theme } = useTheme()

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setOpen(false)
  }, [pathname, setOpen])

  // Close sidebar on window resize if mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        // Desktop - keep open
        setOpen(false) // Actually, let's keep it closed by default on desktop too
      } else {
        // Mobile - close
        setOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [setOpen])

  // Determine which logo to use based on current theme
  const logoSrc = theme === 'dark' ? '/images/dark-logo.png' : '/images/light-logo.png'

  const handleLinkClick = () => {
    // Always close sidebar when clicking a link (both mobile and desktop)
    setOpen(false)
  }

  return (
    <>
      {/* Mobile overlay - only show on mobile when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          // Base positioning and styling
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border',
          'md:relative md:z-auto',
          // Flexbox layout
          'flex flex-col',
          // Smooth transitions
          'transition-transform duration-300 ease-in-out',
          // Transform logic - hide by default, show when open
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // On desktop, override the transform to always show
          'md:translate-x-0',
          // Dark mode
          'dark:bg-card dark:border-border'
        )}
      >
        {/* Header with Logo */}
        <div className="h-16 flex items-center justify-center px-4 border-b border-border flex-shrink-0">
          <Image
            src={logoSrc}
            alt="Enarva OS"
            width={120}
            height={40}
            className="object-contain"
            priority
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={cn(
                    // Base styles
                    'group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                    // Active state
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    // Interactive
                    'cursor-pointer'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0 transition-colors duration-200',
                      isActive
                        ? 'text-primary-foreground'
                        : 'text-muted-foreground group-hover:text-accent-foreground'
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <div className="text-xs text-muted-foreground text-center">
            © 2025 Enarva OS
          </div>
        </div>
      </aside>
    </>
  )
}