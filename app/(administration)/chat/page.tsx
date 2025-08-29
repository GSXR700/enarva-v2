// app/(administration)/chat/page.tsx
'use client'

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ConversationList } from '@/components/chat/ConversationList';
import { ChatWindow } from '@/components/chat/ChatWindow';
import { PopulatedConversation } from '@/types/chat';
import { ChatSkeleton } from '@/components/skeletons/ChatSkeleton'; // Importer le squelette

export default function ChatPage() {
    const { data: session } = useSession();
    const [conversations, setConversations] = useState<PopulatedConversation[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<PopulatedConversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

    const handleSelectConversation = (conversation: PopulatedConversation) => {
        if (!conversations.find(c => c.id === conversation.id)) {
            setConversations(prev => [conversation, ...prev]);
        }
        setSelectedConversation(conversation);
    };

    if (isLoading) {
        return <ChatSkeleton />;
    }

    if (error) {
        return <div className="main-content text-center p-10 text-red-500">{error}</div>;
    }

    const currentUserId = session?.user?.id;
    if (!currentUserId) {
        return <div className="flex items-center justify-center h-full">Veuillez vous connecter pour voir le chat.</div>
    }

    return (
        <div className="flex h-[calc(100vh-4rem)]">
            {/* --- MOBILE VIEW --- */}
            <div className="w-full md:hidden">
                {!selectedConversation ? (
                    <ConversationList 
                        currentUserId={currentUserId}
                        conversations={conversations}
                        onSelect={setSelectedConversation}
                        onNewConversation={handleSelectConversation}
                    />
                ) : (
                    <ChatWindow 
                        currentUserId={currentUserId}
                        conversation={selectedConversation} 
                        onBack={() => setSelectedConversation(null)}
                    />
                )}
            </div>
            {/* --- DESKTOP VIEW --- */}
            <div className="hidden md:flex w-full h-full">
                 <ConversationList 
                    currentUserId={currentUserId}
                    conversations={conversations}
                    selectedConversationId={selectedConversation?.id}
                    onSelect={setSelectedConversation}
                    onNewConversation={handleSelectConversation}
                />
                {selectedConversation ? (
                    <ChatWindow currentUserId={currentUserId} conversation={selectedConversation} />
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground bg-background">
                        <p>Sélectionnez une conversation pour commencer à discuter.</p>
                    </div>
                )}
            </div>
        </div>
    );
}