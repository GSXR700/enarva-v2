// components/layout/TopBar.tsx - CORRECTED (REMOVED UNUSED IMPORT)
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Bell, Search, Menu, MessageSquare, User, Settings, LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AnimatePresence, motion } from 'framer-motion'
import { Activity } from '@prisma/client'
import { getRelativeTime } from '@/lib/utils'
import { ThemeToggle } from '@/components/ThemeToggle'

interface TopBarProps {
  onMenuClick: () => void
}

type ActivityWithUser = Activity & { user: { name: string | null; image: string | null } }

export function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [activities, setActivities] = useState<ActivityWithUser[]>([])
  const [showNotificationDot, setShowNotificationDot] = useState(true)

  const isFieldRoute = pathname === '/dashboard' || 
                       (pathname?.startsWith('/missions/') && pathname?.includes('/execute'))

  const [LanguageSwitcher, setLanguageSwitcher] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    if (isFieldRoute) {
      import('@/components/field/LanguageSwitcher').then((mod) => {
        setLanguageSwitcher(() => mod.LanguageSwitcher)
      }).catch(() => {})
    }
  }, [isFieldRoute])

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities')
        if (response.ok) {
          setActivities(await response.json())
        }
      } catch (error) {
        console.error('Failed to fetch activities', error)
      }
    }
    fetchActivities()
  }, [])

  return (
    <header className="h-16 border-b border-border/50 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="lg:hidden flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onMenuClick} className="hover:bg-accent/50">
            <Menu className="w-6 h-6" />
          </Button>
          <Image src="/images/light-mobile.PNG" alt="Enarva" width={32} height={32} />
        </div>
        <div className="hidden lg:block relative max-w-lg w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher leads, missions, clients..."
            className="pl-11 bg-accent/30 border-none rounded-full h-10 focus:bg-accent/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden hover:bg-accent/50"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="w-5 h-5" />
        </Button>
        
        <Link href="/chat">
          <Button variant="ghost" size="icon" className="hover:bg-accent/50">
            <MessageSquare className="w-5 h-5" />
          </Button>
        </Link>

        <div className="hidden sm:flex items-center">
          <ThemeToggle />
        </div>

        {isFieldRoute && LanguageSwitcher && (
          <div className="hidden sm:block">
            <LanguageSwitcher />
          </div>
        )}

        <DropdownMenu onOpenChange={(open) => !open && setShowNotificationDot(false)}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-accent/50">
              <Bell className="w-5 h-5" />
              {showNotificationDot && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activities.length > 0 ? (
              activities.slice(0, 5).map((activity) => (
                <DropdownMenuItem key={activity.id} className="flex items-start gap-3 py-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={activity.user.image || undefined} />
                    <AvatarFallback>{activity.user.name?.[0] || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{getRelativeTime(activity.createdAt)}</p>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">Aucune notification</div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/activities" className="w-full text-center cursor-pointer">
                Voir toutes les activités
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-accent/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={session?.user?.image || undefined} />
                <AvatarFallback>{session?.user?.name?.[0] || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profil</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Paramètres</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background z-50 p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="icon" onClick={() => setMobileSearchOpen(false)}>
                <X className="w-6 h-6" />
              </Button>
              <Input
                autoFocus
                placeholder="Rechercher..."
                className="flex-1 bg-accent/30 border-none rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}