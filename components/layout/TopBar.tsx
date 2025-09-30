// components/layout/TopBar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { Bell, Search, Menu, MessageSquare, User, Settings, LogOut, X, CheckCircle } from 'lucide-react'
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
  onMenuClick: () => void;
}

type ActivityWithUser = Activity & { user: { name: string | null; image: string | null }};

export function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session } = useSession();
  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [showNotificationDot, setShowNotificationDot] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await fetch('/api/activities');
        if (response.ok) {
          setActivities(await response.json());
        }
      } catch (error) {
        console.error("Failed to fetch activities", error);
      }
    };
    fetchActivities();
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* --- Section Gauche --- */}
      <div className="flex items-center gap-4">
        <div className="lg:hidden flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onMenuClick}>
              <Menu className="w-6 h-6" />
            </Button>
            <Image src="/images/light-mobile.PNG" alt="Enarva" width={32} height={32} />
        </div>
        <div className="hidden lg:block relative max-w-lg w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Rechercher leads, missions, clients..." className="pl-11 bg-secondary border-none rounded-full h-10"/>
        </div>
      </div>

      {/* --- Section Droite --- */}
      <div className="flex items-center gap-1 md:gap-2">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSearchOpen(true)}>
            <Search className="w-5 h-5" />
        </Button>
        <Link href="/chat"><Button variant="ghost" size="icon"><MessageSquare className="w-5 h-5" /></Button></Link>
        <ThemeToggle />
        <DropdownMenu onOpenChange={(open) => !open && setShowNotificationDot(false)}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {showNotificationDot && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80" align="end">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {activities.length > 0 ? activities.map(activity => (
              <DropdownMenuItem key={activity.id} className="flex items-start gap-3">
                 <CheckCircle className="w-5 h-5 mt-1 text-green-500"/>
                 <div className='flex-1'>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{getRelativeTime(activity.createdAt)}</p>
                 </div>
              </DropdownMenuItem>
            )) : <p className="p-4 text-sm text-muted-foreground text-center">Aucune nouvelle notification.</p>}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-6 w-px bg-border mx-2 hidden sm:block" />

        {session?.user && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="p-0.5 rounded-full bg-enarva-gradient cursor-pointer">
                         <Avatar className="h-9 w-9">
                            <AvatarImage src={session.user.image || ''} alt={session.user.name || 'Utilisateur'} />
                            <AvatarFallback>{session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}</AvatarFallback>
                        </Avatar>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{session.user.name || 'Utilisateur'}</span>
                            <span className="text-xs text-muted-foreground">{session.user.email}</span>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/settings/profile" className="flex items-center gap-2 cursor-pointer">
                            <User className="w-4 h-4" />
                            Profil
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
                            <Settings className="w-4 h-4" />
                            Paramètres
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })} className="flex items-center gap-2 cursor-pointer text-red-600">
                        <LogOut className="w-4 h-4" />
                        Se déconnecter
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )}
      </div>

      {/* Mobile Search Overlay */}
      <AnimatePresence>
        {isMobileSearchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background z-10 flex items-center gap-2 p-4 lg:hidden"
          >
            <Search className="w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              className="flex-1 border-none focus-visible:ring-0"
              autoFocus
            />
            <Button variant="ghost" size="icon" onClick={() => setMobileSearchOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}