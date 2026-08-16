import React from 'react';
import { Text } from 'react-native';
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
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key: string) => key,
  }),
}));

jest.mock('@shared/contexts/ThemeContext', () => ({
  useTheme: () => mockTheme,
}));

jest.mock('@shared/hooks', () => ({
  useThemedStyles: (factory: (theme: typeof mockTheme) => unknown) =>
    factory(mockTheme),
}));

jest.mock('phosphor-react-native', () => ({
  ArrowRight: () => null,
  BookOpenText: () => null,
  CaretDown: () => null,
  Robot: () => null,
  ThumbsDown: () => null,
  ThumbsUp: () => null,
  Ticket: () => null,
}));

const makeAssistantMessage = (
  status: ChatMessageStatus,
  citations?: ChatMessage['citations'],
): ChatMessage => ({
  citations,
  id: `assistant-${status}`,
  role: 'assistant',
  content: 'Response',
  createdAt: 0,
  status,
  bookingDraft: { isReadyToSearch: false },
});

const renderMessage = async (
  status: ChatMessageStatus,
  citations?: ChatMessage['citations'],
) => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await act(async () => {
    renderer = ReactTestRenderer.create(
      <ChatMessageBubble
        message={makeAssistantMessage(status, citations)}
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

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'chatbot.bookingAction',
      }).length,
    ).toBeGreaterThan(0);

    await act(async () => renderer.unmount());
  });
  it('hides retrieval sources from the passenger', async () => {
    const renderer = await renderMessage('complete', [
      { title: 'Passenger policy', section: 'Refunds' },
    ]);

    const visibleText = renderer.root
      .findAllByType(Text)
      .flatMap(node => node.props.children)
      .join(' ');

    expect(visibleText).not.toContain('Passenger policy');
    expect(visibleText).not.toContain('Refunds');
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'chatbot.citations.expandAccessibility',
      }),
    ).toHaveLength(0);

    await act(async () => renderer.unmount());
  });

  it.each<ChatMessageStatus>(['streaming', 'error', 'cancelled'])(
    'hides booking when the assistant response is %s',
    async status => {
      const renderer = await renderMessage(status);

      expect(
        renderer.root.findAllByProps({
          accessibilityLabel: 'chatbot.bookingAction',
        }),
      ).toHaveLength(0);

      await act(async () => renderer.unmount());
    },
  );
});
