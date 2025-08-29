// components/chat/ChatWindow.tsx
import { useState, useEffect, useRef } from 'react';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PopulatedConversation } from '@/types/chat';
import { Message, User } from '@prisma/client';
import { ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import Pusher from 'pusher-js';

type PopulatedMessage = Message & { sender: User };

interface ChatWindowProps {
    currentUserId: string;
    conversation: PopulatedConversation;
    onBack?: () => void;
}

export function ChatWindow({ currentUserId, conversation, onBack }: ChatWindowProps) {
    const [messages, setMessages] = useState<PopulatedMessage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        if (!conversation.id) return;

        const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
        });

        const channel = pusherClient.subscribe(`conversation-${conversation.id}`);

        const handleNewMessage = (message: PopulatedMessage) => {
            if (message.senderId !== currentUserId) {
                setMessages((prev) => [...prev, message]);
            }
        };

        channel.bind('new-message', handleNewMessage);

        return () => {
            channel.unbind('new-message', handleNewMessage);
            pusherClient.unsubscribe(`conversation-${conversation.id}`);
        };
    }, [conversation.id, currentUserId]);


    const handleSendMessage = async (content: string) => {
        const tempId = Date.now().toString();
        const newMessage: PopulatedMessage = {
            id: tempId,
            content,
            createdAt: new Date(),
            senderId: currentUserId,
            conversationId: conversation.id,
            readByIds: [currentUserId],
            type: 'TEXT',
            sender: { id: currentUserId, name: 'Vous', email: '', image: '', /* ... autres champs user */ } as User,
        };

        // Optimistic UI update
        setMessages((prev) => [...prev, newMessage]);

        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, senderId: currentUserId, conversationId: conversation.id }),
        });
        
        const savedMessage = await response.json();
        
        // Replace temp message with saved message from DB
        setMessages(prev => prev.map(m => m.id === tempId ? savedMessage : m));
    };

    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);

    return (
        <div className="flex-1 flex flex-col bg-background h-full">
            <div className="flex items-center gap-3 p-3 border-b border-border flex-shrink-0">
                {onBack && <Button variant="ghost" size="icon" className="md:hidden mr-2" onClick={onBack}><ArrowLeft className="w-5 h-5" /></Button>}
                <Avatar><AvatarImage src={otherParticipant?.image || undefined} /><AvatarFallback>{otherParticipant?.name?.substring(0, 2) || '??'}</AvatarFallback></Avatar>
                <div>
                    <p className="font-semibold">{otherParticipant?.name || 'Conversation'}</p>
                    <p className="text-xs text-green-500">{otherParticipant?.onlineStatus === 'ONLINE' ? 'En ligne' : 'Hors ligne'}</p>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
                <AnimatePresence>
                    {messages.map(msg => {
                        const isSelf = msg.senderId === currentUserId;
                        const isRead = msg.readByIds.length > 1;
                        return (
                            <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isSelf && <Avatar className="h-8 w-8 self-end"><AvatarImage src={msg.sender.image || undefined} /><AvatarFallback>{msg.sender.name?.[0]}</AvatarFallback></Avatar>}
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl flex flex-col ${isSelf ? 'bg-enarva-start text-white rounded-br-none' : 'bg-card border rounded-bl-none'}`}>
                                    <p className="text-sm">{msg.content}</p>
                                    <div className="flex items-center gap-2 self-end mt-1">
                                        <p className={`text-xs ${isSelf ? 'text-gray-200' : 'text-muted-foreground'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        {isSelf && (isRead ? <CheckCheck className="w-4 h-4 text-blue-400" /> : <Check className="w-4 h-4 text-gray-300" />)}
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
