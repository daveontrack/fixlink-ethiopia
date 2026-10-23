import type { ID, ISODateString } from "./common";

export interface Conversation {
  id: ID;
  requestId: ID | null;
  bookingId: ID | null;
  customerId: ID;
  professionalId: ID;
  participantName: string;
  participantImage: string | null;
  lastMessage: string | null;
  lastMessageAt: ISODateString | null;
  unreadCount: number;
}

export interface Message {
  id: ID;
  conversationId: ID;
  senderId: ID;
  senderName: string;
  body: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: ISODateString;
}
