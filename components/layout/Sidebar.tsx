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
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={cn(
          // Fixed positioning and transforms for mobile
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border md:relative md:translate-x-0 md:z-auto',
          // FIXED: Remove transform-based transitions on mobile to prevent blur
          'md:transition-all md:duration-300 md:ease-in-out',
          // FIXED: Use simple left positioning instead of transform on mobile
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          // FIXED: Ensure proper rendering optimization
          'will-change-auto transform-gpu'
        )}
        style={{
          // FIXED: Force hardware acceleration for better mobile performance
          transform: isOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)',
          // Reset transform on desktop
          '@media (min-width: 768px)': {
            transform: 'none'
          }
        } as any}
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
                className="object-contain"
                priority
                // FIXED: Prevent image blur on mobile
                style={{ imageRendering: 'crisp-edges' }}
              />
            </div>
            {/* Close button for mobile */}
            <button 
              onClick={() => setOpen(false)} 
              className="md:hidden p-2 rounded-md hover:bg-accent transition-colors touch-manipulation"
              type="button"
              aria-label="Fermer le menu"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-4 flex-1 px-2 space-y-1 overflow-y-auto custom-scrollbar">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  pathname === item.href
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  // FIXED: Enhanced mobile touch targets and text rendering
                  'group flex items-center px-3 py-3 text-sm font-medium rounded-l-md transition-colors duration-150 relative',
                  'touch-manipulation select-none',
                  // FIXED: Prevent text blur on mobile
                  'antialiased font-medium'
                )}
                // FIXED: Ensure proper touch handling
                style={{ 
                  WebkitTapHighlightColor: 'transparent',
                  textRendering: 'optimizeLegibility'
                }}
              >
                <item.icon
                  className={cn(
                    pathname === item.href
                      ? 'text-primary'
                      : 'text-muted-foreground group-hover:text-foreground',
                    'mr-3 flex-shrink-0 h-5 w-5 transition-colors duration-150'
                  )}
                  aria-hidden="true"
                  // FIXED: Ensure icons render crisply
                  style={{ imageRendering: 'crisp-edges' }}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center antialiased">
              © 2025 Enarva OS
            </div>
          </div>
        </div>
      </div>
    </>
  )
}