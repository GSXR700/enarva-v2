// components/chat/NewConversationModal.tsx - COMPLETE ENHANCED VERSION
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { User, UserRole } from '@prisma/client'
import { Search, Users, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectUser: (user: User) => void
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  AGENT: 'Agent',
  TEAM_LEADER: 'Chef d\'équipe',
  TECHNICIAN: 'Technicien'
}

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  MANAGER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  AGENT: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  TEAM_LEADER: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  TECHNICIAN: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
}

export function NewConversationModal({ isOpen, onClose, onSelectUser }: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Fetch all users when modal opens
  useEffect(() => {
    if (isOpen && allUsers.length === 0) {
      setIsLoading(true)
      fetch('/api/users/all')
        .then(res => res.json())
        .then(data => {
          setAllUsers(data)
          setFilteredUsers(data)
        })
        .catch(err => console.error('Failed to fetch users:', err))
        .finally(() => setIsLoading(false))
    }
  }, [isOpen, allUsers.length])

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(allUsers)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredUsers(
        allUsers.filter(user => 
          user.name?.toLowerCase().includes(query) ||
          user.email?.toLowerCase().includes(query) ||
          roleLabels[user.role].toLowerCase().includes(query)
        )
      )
    }
  }, [searchQuery, allUsers])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
      setFilteredUsers(allUsers)
    }
  }, [isOpen, allUsers])

  const handleUserClick = (user: User) => {
    onSelectUser(user)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Nouveau Message
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un membre de l'équipe pour démarrer une conversation
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Rechercher par nom, email ou rôle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        {/* Users List */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun utilisateur trouvé</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map(user => (
                <div 
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors group"
                  onClick={() => handleUserClick(user)}
                >
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.image || undefined} />
                      <AvatarFallback>
                        {user.name?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    {user.onlineStatus === 'ONLINE' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {user.name || 'Sans nom'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${roleColors[user.role]} flex-shrink-0`}
                  >
                    {roleLabels[user.role]}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}