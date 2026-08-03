import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Robot,
  ThumbsDown,
  ThumbsUp,
  Ticket,
} from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatTime } from '@shared/utils/format';
import type {
  ChatBookingDraft,
  ChatFeedbackRating,
  ChatMessage,
} from '../types/chatbot';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  isFeedbackPending: boolean;
  onBookingPress: (draft: ChatBookingDraft) => void;
  onRate: (
    messageId: string,
    assistantMessageId: string,
    rating: ChatFeedbackRating,
  ) => void;
}

function ChatMessageBubbleComponent({
  message,
  isFeedbackPending,
  onBookingPress,
  onRate,
}: ChatMessageBubbleProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isUser = message.role === 'user';
  const language = i18n.language.startsWith('vi') ? 'vi' : 'en';
  const timeLabel = formatTime(message.createdAt, language === 'vi' ? 'vi-VN' : 'en-US');
  const canRate = Boolean(
    !isUser
    && message.status === 'complete'
    && message.assistantMessageId,
  );

  const handlePositiveRating = useCallback(() => {
    if (message.assistantMessageId) {
      onRate(message.id, message.assistantMessageId, 1);
    }
  }, [message.assistantMessageId, message.id, onRate]);

  const handleNegativeRating = useCallback(() => {
    if (message.assistantMessageId) {
      onRate(message.id, message.assistantMessageId, -1);
    }
  }, [message.assistantMessageId, message.id, onRate]);

  const handleBookingPress = useCallback(() => {
    if (message.bookingDraft) onBookingPress(message.bookingDraft);
  }, [message.bookingDraft, onBookingPress]);

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.assistantRow]}>
      {!isUser ? (
        <View style={styles.avatar}>
          <Robot size={15} color={theme.colors.primary} weight="bold" />
        </View>
      ) : null}

      <View style={styles.messageColumn}>
        <View style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}>
          {message.content ? (
            <Text style={[
              styles.messageText,
              isUser ? styles.userMessageText : styles.assistantMessageText,
            ]}>
              {message.content}
            </Text>
          ) : null}

          {message.status === 'streaming' ? (
            <View style={styles.streamingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              {message.content ? (
                <Text style={styles.streamingText}>{t('chatbot.responding')}</Text>
              ) : null}
            </View>
          ) : null}

          {message.status === 'error' && message.content ? (
            <Text style={styles.statusText}>{t('chatbot.responseInterrupted')}</Text>
          ) : null}

          <Text style={[
            styles.timeText,
            isUser ? styles.userTimeText : styles.assistantTimeText,
          ]}>
            {timeLabel}
          </Text>
        </View>

        {!isUser && message.bookingDraft && message.status === 'complete' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('chatbot.bookingAction')}
            onPress={handleBookingPress}
            style={({ pressed }) => [
              styles.bookingCard,
              pressed ? styles.pressed : null,
            ]}
          >
            <View style={styles.bookingIcon}>
              <Ticket size={19} color={theme.colors.primary} weight="fill" />
            </View>
            <View style={styles.bookingTextBlock}>
              <Text style={styles.bookingTitle}>{t('chatbot.bookingSuggestion')}</Text>
              <Text style={styles.bookingSummary} numberOfLines={2}>
                {message.bookingDraft.origin && message.bookingDraft.destination
                  ? `${message.bookingDraft.origin.name} → ${message.bookingDraft.destination.name}`
                  : t('chatbot.completeBookingDetails')}
                {message.bookingDraft.date ? ` · ${message.bookingDraft.date}` : ''}
                {message.bookingDraft.passengers
                  ? ` · ${t('chatbot.passengerCount', { count: message.bookingDraft.passengers })}`
                  : ''}
              </Text>
            </View>
            <ArrowRight size={18} color={theme.colors.primary} weight="bold" />
          </Pressable>
        ) : null}

        {canRate ? (
          <View style={styles.feedbackRow}>
            <Text style={styles.feedbackLabel}>{t('chatbot.helpful')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chatbot.helpfulYes')}
              disabled={isFeedbackPending}
              onPress={handlePositiveRating}
              style={({ pressed }) => [
                styles.feedbackButton,
                message.feedback === 1 ? styles.feedbackButtonActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <ThumbsUp
                size={15}
                color={message.feedback === 1 ? theme.colors.textInverse : theme.colors.textSecondary}
                weight={message.feedback === 1 ? 'fill' : 'regular'}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('chatbot.helpfulNo')}
              disabled={isFeedbackPending}
              onPress={handleNegativeRating}
              style={({ pressed }) => [
                styles.feedbackButton,
                message.feedback === -1 ? styles.feedbackButtonActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <ThumbsDown
                size={15}
                color={message.feedback === -1 ? theme.colors.textInverse : theme.colors.textSecondary}
                weight={message.feedback === -1 ? 'fill' : 'regular'}
              />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export const ChatMessageBubble = memo(ChatMessageBubbleComponent);

const createStyles = (theme: AppTheme) => ({
  row: {
    flexDirection: 'row',
    maxWidth: '90%' as const,
    marginBottom: spacing.lg,
  },
  userRow: {
    alignSelf: 'flex-end' as const,
  },
  assistantRow: {
    alignSelf: 'flex-start' as const,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.sm,
    alignSelf: 'flex-end' as const,
  },
  messageColumn: {
    flexShrink: 1,
    minWidth: 0,
  },
  bubble: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userBubble: {
    backgroundColor: theme.colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurface
      : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    borderBottomLeftRadius: 4,
    ...theme.effects.cardShadow,
  },
  messageText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: 22,
  },
  userMessageText: {
    color: theme.colors.textInverse,
  },
  assistantMessageText: {
    color: theme.colors.textPrimary,
  },
  streamingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 20,
    marginTop: spacing.xs,
  },
  streamingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  statusText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    marginTop: spacing.sm,
  },
  timeText: {
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    textAlign: 'right' as const,
    marginTop: spacing.xs,
  },
  userTimeText: {
    color: theme.colors.textInverse,
    opacity: 0.68,
  },
  assistantTimeText: {
    color: theme.colors.textTertiary,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  bookingIcon: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surfaceElevated,
  },
  bookingTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  bookingTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  bookingSummary: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  feedbackLabel: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginRight: 2,
  },
  feedbackButton: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.effects.glassSurface,
  },
  feedbackButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
