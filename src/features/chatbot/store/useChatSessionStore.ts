import { create } from 'zustand';

import { registerSessionCleanup } from '@shared/session/cleanup';
import type { ChatBookingDraft, ChatMessage } from '../types/chatbot';

interface ChatSessionState {
  bookingDraft?: ChatBookingDraft;
  conversationId?: string;
  messages: ChatMessage[];
  quickActionsDismissed: boolean;
  reset: () => void;
  setBookingDraft: (draft?: ChatBookingDraft) => void;
  setConversationId: (id?: string) => void;
  setMessages: (
    updater: ChatMessage[] | ((current: ChatMessage[]) => ChatMessage[]),
  ) => void;
  setQuickActionsDismissed: (value: boolean) => void;
}

const emptyState = {
  bookingDraft: undefined as ChatBookingDraft | undefined,
  conversationId: undefined as string | undefined,
  messages: [] as ChatMessage[],
  quickActionsDismissed: false,
};

/**
 * In-memory only. Survives leaving the Chatbot screen, but is dropped when
 * the JS process is killed or the user signs out.
 */
export const useChatSessionStore = create<ChatSessionState>((set) => ({
  ...emptyState,
  reset: () => set(emptyState),
  setBookingDraft: (bookingDraft) => set({ bookingDraft }),
  setConversationId: (conversationId) => set({ conversationId }),
  setMessages: (updater) => set((state) => ({
    messages: typeof updater === 'function' ? updater(state.messages) : updater,
  })),
  setQuickActionsDismissed: (quickActionsDismissed) => set({ quickActionsDismissed }),
}));

registerSessionCleanup('chatbot', () => {
  useChatSessionStore.getState().reset();
});
