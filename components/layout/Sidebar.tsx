'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  FileBarChart
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

  return (
    <div
      className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 flex-col bg-white border-r transition-transform duration-300 ease-in-out md:relative md:translate-x-0',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between h-16 flex-shrink-0 px-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">Enarva OS</h1>
          <button onClick={() => setOpen(false)} className="md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="mt-8 flex-1 px-2 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                pathname === item.href
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
              )}
            >
              <item.icon
                className={cn(
                  pathname === item.href
                    ? 'text-blue-500'
                    : 'text-gray-400 group-hover:text-gray-500',
                  'mr-3 flex-shrink-0 h-5 w-5'
                )}
                aria-hidden="true"
              />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  )
}