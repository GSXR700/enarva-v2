// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Home,
  Users,
  FileText,
  Calendar,
  CheckSquare,
  Package,
  CreditCard,
  Settings,
  UserCheck,
  BarChart3,
  Star,
  MessageSquare,
  Receipt,
  X,
} from 'lucide-react'

const navigationItems = [
  { title: 'Dashboard', href: '/', icon: Home },
  { title: 'Leads', href: '/leads', icon: UserCheck },
  { title: 'Devis', href: '/quotes', icon: FileText },
  { title: 'Missions', href: '/missions', icon: CheckSquare },
  { title: 'Équipes', href: '/teams', icon: Users },
  { title: 'Planning', href: '/planning', icon: Calendar },
  { title: 'Inventaire', href: '/inventory', icon: Package },
  { title: 'Facturation', href: '/billing', icon: CreditCard },
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Dépenses', href: '/expenses', icon: Receipt }, // LIGNE AJOUTÉE
  { title: 'Fidélisation', href: '/loyalty', icon: Star },
  { title: 'Communications', href: '/chat', icon: MessageSquare },
  { title: 'Paramètres', href: '/settings', icon: Settings },
]

interface SidebarProps {
  isOpen: boolean;
  setOpen: (isOpen: boolean) => void;
}

export function Sidebar({ isOpen, setOpen }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Overlay for mobile to close sidebar on click outside */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/60 z-30 transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar container */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-card border-r border-border z-40 transition-transform duration-300 ease-in-out flex flex-col",
          "w-64", // Standard width
          "lg:translate-x-0", // Always visible and in place on desktop
          isOpen ? "translate-x-0" : "-translate-x-full" // Controls mobile visibility
        )}
      >
        {/* Logo Section - Centered with original size */}
        <div className="relative flex items-center justify-center h-16 border-b border-border flex-shrink-0">
          <Link href="/">
              <Image src="/images/enarva-logo.svg" alt="Enarva Logo" width={140} height={60} priority />
          </Link>
          <button 
            onClick={() => setOpen(false)} 
            className="lg:hidden absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-secondary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => { if (isOpen) setOpen(false) }} // Close on mobile navigation
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-medium",
                      isActive 
                        ? "bg-enarva-gradient text-white shadow-md" 
                        : "text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
       {/* Pusher element for desktop layout to prevent content from going under the fixed sidebar */}
       <div className="w-0 lg:w-64 flex-shrink-0" />
    </>
  )
}