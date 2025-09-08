'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PopulatedConversation } from '@/types/chat';
import { Message, User } from '@prisma/client';
import { ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePusherChannel } from '@/hooks/usePusherClient'; // <-- IMPORT the new hook
import { ChatWindowSkeleton } from '../skeletons/ChatWindowSkeleton';
import { getRelativeTime } from '@/lib/utils';

type PopulatedMessage = Message & { sender: User };

interface ChatWindowProps {
    currentUserId: string;
    conversation: PopulatedConversation;
    onBack?: () => void;
    onlineMembers: string[];
}

export function ChatWindow({ currentUserId, conversation, onBack, onlineMembers }: ChatWindowProps) {
    const [messages, setMessages] = useState<PopulatedMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
    const isOnline = otherParticipant ? onlineMembers.includes(otherParticipant.id) : false;

    useEffect(() => {
        if (!conversation?.id) return;
        const fetchMessages = async () => {
            try {
                setIsLoading(true);
                const res = await fetch(`/api/conversations/${conversation.id}/messages`);
                const data = await res.json();
                setMessages(data);
            } catch (error) {
                console.error("Failed to fetch messages", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMessages();
    }, [conversation.id]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // <-- REFACTORED: Use the centralized hook for new messages
    const handleNewMessage = useCallback((message: PopulatedMessage) => {
        setMessages((prev) => {
            // Avoid adding duplicate messages if optimistic update already added it
            if (prev.find(m => m.id === message.id)) {
                return prev;
            }
            return [...prev, message];
        });
    }, []);

    usePusherChannel(`conversation-${conversation.id}`, {
        'new-message': handleNewMessage,
    });

    const handleSendMessage = async (content: string) => {
        const tempId = Date.now().toString();
        const newMessage: PopulatedMessage = {
            id: tempId, content, createdAt: new Date(), senderId: currentUserId,
            conversationId: conversation.id, readByIds: [currentUserId], type: 'TEXT',
            sender: { id: currentUserId, name: 'Vous' } as User,
        };

        setMessages((prev) => [...prev, newMessage]);

        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, senderId: currentUserId, conversationId: conversation.id }),
        });
        
        const savedMessage = await response.json();
        
        setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));
    };

    if (isLoading) {
        return <ChatWindowSkeleton />;
    }

    return (
        <div className="flex-1 flex flex-col bg-background h-full">
            <div className="flex items-center gap-3 p-3 border-b border-border flex-shrink-0">
                {onBack && <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>}
                <Avatar><AvatarImage src={otherParticipant?.image || undefined} /><AvatarFallback>{otherParticipant?.name?.substring(0, 2) || '??'}</AvatarFallback></Avatar>
                <div>
                    <p className="font-semibold">{otherParticipant?.name || 'Conversation'}</p>
                    <p className={`text-xs ${isOnline ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {isOnline ? 'En ligne' : (otherParticipant?.lastSeen ? `Vu ${getRelativeTime(otherParticipant.lastSeen)}` : 'Hors ligne')}
                    </p>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                    {messages.map(msg => {
                        const isSelf = msg.senderId === currentUserId;
                        const isRead = msg.readByIds.length > 1;
                        return (
                            <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                                className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isSelf && <Avatar className="h-8 w-8 self-end mb-1"><AvatarImage src={msg.sender.image || undefined} /><AvatarFallback>{msg.sender.name?.[0]}</AvatarFallback></Avatar>}
                                <div className={`max-w-xs md:max-w-lg px-3 py-2 rounded-2xl flex items-end gap-2 shadow-md ${isSelf ? 'bg-enarva-gradient text-white rounded-br-none' : 'bg-card border rounded-bl-none'}`}>
                                    <p className="text-sm" style={{ wordBreak: 'break-word' }}>{msg.content}</p>
                                    <div className="flex-shrink-0 self-end flex items-center gap-1">
                                        <p className="text-xs opacity-70">
                                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {isSelf && (isRead ? <CheckCheck className="w-4 h-4 text-blue-300" /> : <Check className="w-4 h-4 opacity-70" />)}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>
            <MessageInput onSendMessage={handleSendMessage} />
        </div>
    );
}
