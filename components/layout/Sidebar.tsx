'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/lib/utils'
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
  X
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
    name: 'Contrôles Qualité',
    href: '/quality-checks',
    icon: ClipboardCheck,
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

  // Determine which logo to use based on current theme
  const logoSrc = theme === 'dark' ? '/images/dark-logo.png' : '/images/light-logo.png'

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 sidebar-overlay-fix z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={cn(
          // Base styles for mobile - always fixed positioned
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border',
          'flex flex-col transition-transform duration-300 ease-in-out',
          // Desktop styles - relative positioning, always visible
          'md:relative md:z-auto md:translate-x-0',
          // Mobile transform logic - ONLY applies on mobile (below md breakpoint)
          isOpen ? 'translate-x-0' : '-translate-x-full',
          // Dark mode and performance fixes
          'dark:bg-card dark:border-border sidebar-mobile-fix sidebar-container'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header with Logo */}
          <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 border-b border-border">
            <div className="flex items-center justify-center flex-1">
              <Image
                src={logoSrc}
                alt="Enarva OS"
                width={120}
                height={40}
                className="object-contain transition-opacity duration-300 sidebar-logo-fix"
                priority
              />
            </div>
            {/* Close button for mobile only */}
            <button 
              onClick={() => setOpen(false)} 
              className={cn(
                "md:hidden p-2 rounded-md hover:bg-accent transition-colors z-10",
                "flex items-center justify-center",
                "touch-manipulation cursor-pointer"
              )}
            >
              <X className="w-5 h-5 text-muted-foreground sidebar-icon-fix" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-4 flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)} // Close sidebar on mobile when link is clicked
                className={cn(
                  pathname === item.href
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  'group flex items-center px-3 py-2.5 text-sm font-medium rounded-l-md transition-all duration-200 relative',
                  'sidebar-link cursor-pointer'
                )}
              >
                <item.icon
                  className={cn(
                    pathname === item.href
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-200 sidebar-icon-fix'
                  )}
                  aria-hidden="true"
                />
                <span className="sidebar-text-fix">
                  {item.name}
                </span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              © 2025 Enarva OS
            </div>
          </div>
        </div>
      </div>
    </>
  )
}