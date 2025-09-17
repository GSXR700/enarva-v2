'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { PopulatedConversation } from '@/types/chat';
import { ConversationListSkeleton } from '@/components/skeletons/ConversationListSkeleton';
import { ChatWindowSkeleton } from '@/components/skeletons/ChatWindowSkeleton';
import { usePusherChannel } from '@/hooks/usePusherClient';

export default function ChatPage() {
    const { data: session } = useSession();
    const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<PopulatedConversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [onlineMembers, setOnlineMembers] = useState<string[]>([]);

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await fetch('/api/conversations');
                if (!res.ok) throw new Error("Failed to fetch conversations");
                const data = await res.json();
                setConversations(data);
                if (window.innerWidth >= 768 && data.length > 0) {
                    setSelectedConversation(data[0]);
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversations();
    }, []);

    // Use the centralized hook for presence events
    usePusherChannel('presence-global', {
        'pusher:subscription_succeeded': (data: any) => {
            const members = Object.keys(data.members);
            setOnlineMembers(members);
        },
        'pusher:member_added': (member: { id: string }) => {
            setOnlineMembers(prev => Array.from(new Set([...prev, member.id])));
        },
        'pusher:member_removed': (member: { id: string }) => {
            setOnlineMembers(prev => prev.filter(id => id !== member.id));
        },
    });

    const handleSelectConversation = (conversation: PopulatedConversation) => {
        if (!conversations.find(c => c.id === conversation.id)) {
            setConversations(prev => [conversation, ...prev]);
        }
        setSelectedConversation(conversation);
    };

    // ✅ Fix: Cast session to get id property
    const currentUserId = (session?.user as any)?.id;
    if (!currentUserId) {
        return <div className="flex items-center justify-center h-full">Veuillez vous connecter pour voir le chat.</div>
    }

    if (isLoading) {
         return (
            <div className="flex h-[calc(100vh-4rem)]">
                <ConversationListSkeleton />
                <ChatWindowSkeleton />
            </div>
        );
    }
    
    if (error) {
        return <div className="main-content text-center p-10 text-red-500">{error}</div>;
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            <div className="w-full md:hidden">
                {!selectedConversation ? (
                    <ConversationList
                        currentUserId={currentUserId}
                        conversations={conversations}
                        onSelect={setSelectedConversation}
                        onNewConversation={handleSelectConversation}
                        onlineMembers={onlineMembers}
                    />
                ) : (
                    <ChatWindow
                        currentUserId={currentUserId}
                        conversation={selectedConversation}
                        onBack={() => setSelectedConversation(null)}
                        onlineMembers={onlineMembers}
                    />
                )}
            </div>
            <div className="hidden md:flex w-full h-full">
                 <ConversationList
    currentUserId={currentUserId}
    conversations={conversations}
    selectedConversationId={selectedConversation?.id ?? undefined}
    onSelect={setSelectedConversation}
    onNewConversation={handleSelectConversation}
    onlineMembers={onlineMembers}
/>
                {selectedConversation ? (
                    <ChatWindow
                        currentUserId={currentUserId}
                        conversation={selectedConversation}
                        onlineMembers={onlineMembers}
                    />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
                        <p>Sélectionnez une conversation pour commencer à discuter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}