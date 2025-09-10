// types/chat.ts
import { Conversation as PrismaConversation, Message, User } from '@prisma/client'

// ✅ Updated PopulatedMessage to match current Prisma schema
export type PopulatedMessage = Message & { 
  sender: User;
  readBy?: User[];
};

export type PopulatedConversation = PrismaConversation & { 
  participants: User[];
  messages: Message[];
};