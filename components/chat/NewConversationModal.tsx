// components/chat/NewConversationModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from '@prisma/client'

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export function NewConversationModal({ isOpen, onClose, onSelectUser }: NewConversationModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setUsers([]);
      return;
    }

    const handler = setTimeout(() => {
      if (searchQuery.length > 0) {
        setIsLoading(true);
        fetch(`/api/users/search?q=${searchQuery}`)
          .then(res => res.json())
          .then(data => setUsers(data))
          .finally(() => setIsLoading(false));
      } else {
        setUsers([]);
      }
    }, 300); // Debounce to avoid too many requests

    return () => clearTimeout(handler);
  }, [searchQuery, isOpen]);
  
  const handleUserClick = (user: User) => {
    onSelectUser(user);
    onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau Message</DialogTitle>
          <DialogDescription>
            Recherchez un membre de l'équipe pour démarrer une conversation.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <Input 
            placeholder="Taper un nom..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
            {isLoading && <p className="text-muted-foreground text-sm">Recherche...</p>}
            {!isLoading && users.map(user => (
                <div 
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary cursor-pointer"
                    onClick={() => handleUserClick(user)}
                >
                    <Avatar>
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>{user.name?.substring(0, 2) || '??'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                </div>
            ))}
             {!isLoading && users.length === 0 && searchQuery.length > 0 && (
                <p className="text-muted-foreground text-sm text-center py-4">Aucun utilisateur trouvé.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  )
}