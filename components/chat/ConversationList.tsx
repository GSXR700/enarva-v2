// components/chat/ConversationList.tsx - COMPLETE FIXED VERSION
'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, getRelativeTime } from '@/lib/utils'
import { PopulatedConversation } from '@/types/chat'
import { NewConversationModal } from './NewConversationModal'
import { User } from '@prisma/client'
import { PenSquare, MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'

interface ConversationListProps {
  currentUserId: string
  conversations: PopulatedConversation[]
  selectedConversationId?: string | undefined  // ✅ FIXED: Added | undefined
  onSelect: (conversation: PopulatedConversation) => void
  onNewConversation: (conversation: PopulatedConversation) => void
  onlineMembers: string[]
}

export function ConversationList({ 
  currentUserId, 
  conversations, 
  selectedConversationId, 
  onSelect, 
  onNewConversation, 
  onlineMembers 
}: ConversationListProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSelectUser = async (user: User) => {
    try {
      const response = await fetch('/api/conversations/findOrCreate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentUserId, 
          otherUserId: user.id 
          // Note: No missionId - allows general chat
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const conversation = await response.json()
      onNewConversation(conversation)
      setIsModalOpen(false)
      toast.success(`Conversation avec ${user.name} ouverte`)
    } catch (error) {
      console.error('Failed to create or find conversation:', error)
      toast.error('Impossible de créer la conversation')
    }
  }

  return (
    <>
      <NewConversationModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectUser={handleSelectUser}
      />
      
      <aside className="w-full md:w-1/3 lg:w-1/4 border-r border-border bg-card flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">Discussions</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsModalOpen(true)}
            className="hover:bg-primary/10"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </Button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center">
              <MessageSquarePlus className="w-12 h-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground mb-4">
                Aucune conversation pour le moment
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsModalOpen(true)}
              >
                <PenSquare className="w-4 h-4 mr-2" />
                Démarrer une conversation
              </Button>
            </div>
          ) : (
            conversations.map((convo) => {
              const otherParticipant = convo.participants.find(p => p.id !== currentUserId)
              const lastMessage = convo.messages[0]
              const isOnline = otherParticipant ? onlineMembers.includes(otherParticipant.id) : false
              const unreadCount = convo.messages.filter(m => !m.isRead && m.senderId !== currentUserId).length

              return (
                <div 
                  key={convo.id}
                  onClick={() => onSelect(convo)}
                  className={cn(
                    "flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary transition-colors border-b border-border/50",
                    selectedConversationId === convo.id && 'bg-secondary'
                  )}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={otherParticipant?.image || undefined} />
                      <AvatarFallback>
                        {otherParticipant?.name?.substring(0, 2).toUpperCase() || '??'}
                      </AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold truncate">
                        {otherParticipant?.name || 'Utilisateur'}
                      </p>
                      {lastMessage && (
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                          {getRelativeTime(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                      )}>
                        {lastMessage?.content || 'Démarrez la conversation'}
                      </p>
                      {unreadCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-[20px] px-1 flex items-center justify-center text-xs">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>
    </>
  )
}