export const shouldShowChatQuickActions = (
  messages: readonly { id: string }[],
  dismissed: boolean,
): boolean => (
  !dismissed
  && messages.length === 1
  && messages[0]?.id === 'welcome'
);

export const getChatThreadMinHeight = (height: number): number | undefined => (
  Number.isFinite(height) && height > 0 ? Math.round(height) : undefined
);
