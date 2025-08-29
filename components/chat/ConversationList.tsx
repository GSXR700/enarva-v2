// components/chat/ConversationList.tsx
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PopulatedConversation } from '@/types/chat';
import { NewConversationModal } from './NewConversationModal';
import { User } from '@prisma/client';
import { PenSquare } from 'lucide-react';

interface ConversationListProps {
    currentUserId: string;
    conversations: PopulatedConversation[];
    selectedConversationId?: string;
    onSelect: (conversation: PopulatedConversation) => void;
    onNewConversation: (conversation: PopulatedConversation) => void;
    onlineMembers: string[];
}

export function ConversationList({ currentUserId, conversations, selectedConversationId, onSelect, onNewConversation, onlineMembers }: ConversationListProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleSelectUser = async (user: User) => {
        try {
            const response = await fetch('/api/conversations/findOrCreate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentUserId, otherUserId: user.id }),
            });
            if (!response.ok) throw new Error("Failed to create conversation");
            const conversation = await response.json();
            onNewConversation(conversation);
        } catch (error) {
            console.error("Failed to create or find conversation", error);
        }
    };

    return (
        <>
            <NewConversationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSelectUser={handleSelectUser}
            />
            <aside className="w-full md:w-1/3 lg:w-1/4 border-r border-border bg-card flex flex-col h-full">
                <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
                    <h2 className="text-xl font-bold">Discussions</h2>
                    <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(true)}>
                        <PenSquare className="w-5 h-5" />
                    </Button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {conversations.map((convo) => {
                        const otherParticipant = convo.participants.find(p => p.id !== currentUserId);
                        const lastMessage = convo.messages[0];
                        const isOnline = otherParticipant ? onlineMembers.includes(otherParticipant.id) : false;

                        return (
                            <div 
                                key={convo.id}
                                onClick={() => onSelect(convo)}
                                className={cn(
                                    "flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary",
                                    selectedConversationId === convo.id && 'bg-secondary'
                                )}
                            >
                                <Avatar className="h-12 w-12 relative">
                                    <AvatarImage src={otherParticipant?.image || undefined} />
                                    <AvatarFallback>{otherParticipant?.name?.substring(0, 2) || '??'}</AvatarFallback>
                                    {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />}
                                </Avatar>
                                <div className="flex-1 truncate">
                                    <p className="font-semibold truncate">{otherParticipant?.name || 'Groupe'}</p>
                                    <p className="text-sm text-muted-foreground truncate">{lastMessage?.content || 'Démarrez la conversation'}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}