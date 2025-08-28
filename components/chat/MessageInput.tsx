// components/chat/MessageInput.tsx
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Mic, Send } from 'lucide-react';

interface MessageInputProps {
    onSendMessage: (content: string) => void;
}

export function MessageInput({ onSendMessage }: MessageInputProps) {
    const [content, setContent] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (content.trim()) {
            onSendMessage(content.trim());
            setContent('');
        }
    };

    return (
        <div className="p-4 bg-card border-t border-border">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0"><Paperclip className="w-5 h-5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0"><Mic className="w-5 h-5" /></Button>
                <Input 
                    placeholder="Écrivez votre message..." 
                    className="h-10"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                />
                <Button type="submit" size="icon" className="bg-enarva-gradient h-10 w-10 flex-shrink-0">
                    <Send className="w-5 h-5" />
                </Button>
            </form>
        </div>
    );
}