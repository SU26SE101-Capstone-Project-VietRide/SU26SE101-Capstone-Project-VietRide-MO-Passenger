import type { Location } from '@features/location/types/location';

export type ChatMessageRole = 'user' | 'assistant';
export type ChatMessageStatus = 'complete' | 'streaming' | 'error' | 'cancelled';
export type ChatFeedbackRating = -1 | 1;

export interface ChatBookingDraft {
  origin?: Location;
  destination?: Location;
  date?: string;
  passengers?: number;
  isReadyToSearch: boolean;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: number;
  status: ChatMessageStatus;
  assistantMessageId?: string;
  citedChunkIds?: string[];
  feedback?: ChatFeedbackRating;
  bookingDraft?: ChatBookingDraft;
}

export interface CreateChatRequest {
  message: string;
  conversationId?: string;
}

export interface RagChatTokenData {
  content: string;
}

export interface RagChatDoneData {
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  citedChunkIds: string[];
}

export interface RagChatErrorData {
  code: string;
  message: string;
}

export type RagChatSseEvent =
  | { event: 'token'; data: RagChatTokenData }
  | { event: 'done'; data: RagChatDoneData }
  | { event: 'error'; data: RagChatErrorData };

export interface ChatFeedbackResponse {
  id: string;
  messageId: string;
  conversationId: string;
  userId: string;
  rating: ChatFeedbackRating;
  createdAt: string;
  updatedAt: string;
}
