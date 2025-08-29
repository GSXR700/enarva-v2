// components/layout/TopBar.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { Bell, Search, MoreHorizontal, Menu, MessageSquare, User, Settings, LogOut, X } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { AnimatePresence, motion } from 'framer-motion'

interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const { data: session, status } = useSession();
  const [isMobileSearchOpen, setMobileSearchOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-card px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* --- Section Gauche (Mobile: Menu / Desktop: Logo + Recherche) --- */}
      <div className="flex items-center gap-4">
        {/* Logo et Menu Burger pour Mobile */}
        <div className="lg:hidden flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onMenuClick}>
              <Menu className="w-6 h-6" />
            </Button>
            <Image src="/images/light-mobile.PNG" alt="Enarva" width={32} height={32} />
        </div>

        {/* Barre de Recherche pour Desktop */}
        <div className="hidden lg:block relative max-w-lg w-full">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Rechercher leads, missions, clients..."
            className="pl-11 bg-secondary border-none rounded-full h-10" // Style mis à jour
          />
        </div>
      </div>

      {/* --- Section Droite (Icônes et Menu Utilisateur) --- */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Icône de recherche pour Mobile */}
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSearchOpen(true)}>
            <Search className="w-5 h-5" />
        </Button>
        
        <Link href="/chat">
            <Button variant="ghost" size="icon" className="relative">
                <MessageSquare className="w-5 h-5" />
            </Button>
        </Link>
        
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

        <div className="h-6 w-px bg-border mx-2 hidden sm:block" />

        {status === 'authenticated' && session.user ? (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {/* Avatar avec bordure dégradée */}
                    <div className="p-0.5 rounded-full bg-enarva-gradient cursor-pointer">
                         <Avatar className="h-9 w-9">
                            <AvatarImage src={session.user.image || ''} alt={session.user.name || 'Utilisateur'} />
                            <AvatarFallback>
                                {session.user.name ? session.user.name.split(' ').map(n => n[0]).join('') : <User />}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{session.user.name}</p>
                            <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <Link href="/profile" passHref><DropdownMenuItem><User className="mr-2 h-4 w-4" /><span>Profil</span></DropdownMenuItem></Link>
                    <Link href="/settings" passHref><DropdownMenuItem><Settings className="mr-2 h-4 w-4" /><span>Réglages</span></DropdownMenuItem></Link>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-500" onClick={() => signOut({ callbackUrl: '/login' })}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Déconnexion</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ) : (
             <Link href="/login">
                <Button variant="outline">Se connecter</Button>
             </Link>
        )}
      </div>

      {/* --- Barre de Recherche Animée pour Mobile --- */}
      <AnimatePresence>
        {isMobileSearchOpen && (
            <motion.div 
                initial={{ y: '-100%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-100%', opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="absolute top-0 left-0 w-full h-full bg-card px-4 flex items-center gap-2 z-30"
            >
                <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <Input
                    placeholder="Rechercher dans Enarva..."
                    className="h-full bg-transparent border-none text-base focus-visible:ring-0 focus-visible:ring-offset-0"
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