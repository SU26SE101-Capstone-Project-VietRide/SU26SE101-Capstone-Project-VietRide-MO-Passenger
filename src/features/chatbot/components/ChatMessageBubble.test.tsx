import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

import type { ChatMessage, ChatMessageStatus } from '../types/chatbot';
import { ChatMessageBubble } from './ChatMessageBubble';

const mockTheme = {
  isDark: false,
  colors: {
    border: '#ddd',
    error: '#c00',
    primary: '#087f5b',
    primaryFaded: '#e6fcf5',
    textInverse: '#fff',
    textPrimary: '#111',
    textSecondary: '#555',
    textTertiary: '#777',
  },
  effects: {
    cardShadow: {},
    glassBorder: '#ddd',
    glassSurface: '#fff',
    glassSurfaceStrong: '#fff',
  },
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) => factory(mockTheme),
}));

jest.mock('phosphor-react-native', () => ({
  ArrowRight: () => null,
  Robot: () => null,
  ThumbsDown: () => null,
  ThumbsUp: () => null,
  Ticket: () => null,
}));

const makeAssistantMessage = (status: ChatMessageStatus): ChatMessage => ({
  id: `assistant-${status}`,
  role: 'assistant',
  content: 'Response',
  createdAt: 0,
  status,
  bookingDraft: { isReadyToSearch: false },
});

const renderMessage = async (status: ChatMessageStatus) => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ChatMessageBubble
        message={makeAssistantMessage(status)}
        isFeedbackPending={false}
        onBookingPress={jest.fn()}
        onRate={jest.fn()}
      />,
    );
  });

  return renderer!;
};

describe('ChatMessageBubble', () => {
  it('shows booking only after the assistant response completes', async () => {
    const renderer = await renderMessage('complete');

    expect(renderer.root.findAllByProps({
      accessibilityLabel: 'chatbot.bookingAction',
    }).length).toBeGreaterThan(0);

    await act(async () => renderer.unmount());
  });

  it.each<ChatMessageStatus>(['streaming', 'error', 'cancelled'])(
    'hides booking when the assistant response is %s',
    async (status) => {
      const renderer = await renderMessage(status);

      expect(renderer.root.findAllByProps({
        accessibilityLabel: 'chatbot.bookingAction',
      })).toHaveLength(0);

      await act(async () => renderer.unmount());
    },
  );
});
