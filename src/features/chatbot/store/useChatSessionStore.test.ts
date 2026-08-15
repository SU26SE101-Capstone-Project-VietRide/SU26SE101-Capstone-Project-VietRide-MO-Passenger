import fs from 'fs';
import path from 'path';

import { useChatSessionStore } from './useChatSessionStore';

describe('useChatSessionStore', () => {
  beforeEach(() => {
    useChatSessionStore.getState().reset();
  });

  it('keeps messages and conversation id in memory until reset', () => {
    useChatSessionStore.getState().setConversationId('11111111-1111-4111-8111-111111111111');
    useChatSessionStore.getState().setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello',
        createdAt: 1,
        status: 'complete',
      },
    ]);
    useChatSessionStore.getState().setQuickActionsDismissed(true);

    expect(useChatSessionStore.getState().conversationId)
      .toBe('11111111-1111-4111-8111-111111111111');
    expect(useChatSessionStore.getState().messages).toHaveLength(1);
    expect(useChatSessionStore.getState().quickActionsDismissed).toBe(true);
  });

  it('clears the in-memory session without writing persistence keys', () => {
    useChatSessionStore.getState().setConversationId('11111111-1111-4111-8111-111111111111');
    useChatSessionStore.getState().setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello',
        createdAt: 1,
        status: 'complete',
      },
    ]);

    useChatSessionStore.getState().reset();

    expect(useChatSessionStore.getState()).toMatchObject({
      bookingDraft: undefined,
      conversationId: undefined,
      messages: [],
      quickActionsDismissed: false,
    });
  });

  it('does not persist chat to disk', () => {
    const source = fs.readFileSync(path.join(__dirname, 'useChatSessionStore.ts'), 'utf8');
    expect(source).not.toContain('persist');
    expect(source).not.toContain('AsyncStorage');
    expect(source).toContain("registerSessionCleanup('chatbot'");
  });
});
