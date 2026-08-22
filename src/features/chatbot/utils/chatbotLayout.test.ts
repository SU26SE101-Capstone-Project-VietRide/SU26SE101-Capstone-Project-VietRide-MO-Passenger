import {
  getChatThreadMinHeight,
  shouldShowChatQuickActions,
} from './chatbotLayout';

describe('chatbot responsive layout', () => {
  it('shows quick actions only for an undismissed welcome-only thread', () => {
    expect(shouldShowChatQuickActions([{ id: 'welcome' }], false)).toBe(true);
    expect(shouldShowChatQuickActions([{ id: 'welcome' }], true)).toBe(false);
    expect(shouldShowChatQuickActions([
      { id: 'welcome' },
      { id: 'message-1' },
    ], false)).toBe(false);
  });

  it('bounds the message content to a measured positive viewport', () => {
    expect(getChatThreadMinHeight(548.4)).toBe(548);
    expect(getChatThreadMinHeight(0)).toBeUndefined();
    expect(getChatThreadMinHeight(Number.NaN)).toBeUndefined();
  });
});
