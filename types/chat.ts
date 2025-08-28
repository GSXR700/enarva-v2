// types/chat.ts
import { Conversation as PrismaConversation, Message, User } from '@prisma/client'

export type PopulatedConversation = PrismaConversation & { 
    participants: User[];
    messages: Message[];
};