import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  StatusBar,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  FlashList,
  type FlashListRef,
  type ListRenderItemInfo,
} from '@shopify/flash-list';
import { ArrowLeft, NotePencil } from 'phosphor-react-native';
import { Image } from 'expo-image';

import type { RootStackParamList } from '@app/navigation/types';
import { APP_LOGO } from '@shared/constants/assets';
import { useBookingStore } from '@features/booking/store/useBookingStore';
import type { BookingSearchPrefill } from '@features/booking/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import {
  ChatComposer,
  ChatMessageBubble,
  ChatQuickActions,
} from '../components';
import { useChatSession } from '../hooks/useChatSession';
import { useChatSessionStore } from '../store/useChatSessionStore';
import {
  getChatThreadMinHeight,
  shouldShowChatQuickActions,
} from '../utils/chatbotLayout';
import type {
  ChatBookingDraft,
  ChatFeedbackRating,
  ChatMessage,
} from '../types/chatbot';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chatbot'>;

const WELCOME_MESSAGE_ID = 'welcome';
const keyExtractor = (item: ChatMessage): string => item.id;
const getItemType = (item: ChatMessage): string => item.role;
const maintainVisibleContentPosition = {
  startRenderingFromBottom: true,
  autoscrollToBottomThreshold: 0.15,
  animateAutoScrollToBottom: false,
};

export function ChatbotScreen(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp>();
  const listRef = useRef<FlashListRef<ChatMessage> | null>(null);
  const [threadHeight, setThreadHeight] = useState(0);
  const quickActionsDismissed = useChatSessionStore(
    (state) => state.quickActionsDismissed,
  );
  const setQuickActionsDismissed = useChatSessionStore(
    (state) => state.setQuickActionsDismissed,
  );
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();
  const applySearchPrefill = useBookingStore((state) => state.applySearchPrefill);
  const {
    availability,
    feedbackError,
    isOnline,
    isStreaming,
    messages,
    pendingFeedbackId,
    rateMessage,
    resetConversation,
    sendMessage,
    stopResponse,
  } = useChatSession();

  const statusLabel = useMemo(() => {
    if (!isOnline) return t('chatbot.offline');
    if (isStreaming) return t('chatbot.responding');
    if (availability === 'phoneRequired') return t('chatbot.profileRequired');
    return t('chatbot.online');
  }, [availability, isOnline, isStreaming, t]);

  const composerPlaceholder = useMemo(() => {
    if (!isOnline) return t('chatbot.offlinePlaceholder');
    if (availability !== 'ready') return t('chatbot.lockedPlaceholder');
    return t('chatbot.askPlaceholder');
  }, [availability, isOnline, t]);

  const isWelcomeOnly = messages.length === 1
    && messages[0]?.id === WELCOME_MESSAGE_ID;
  const showQuickActions = shouldShowChatQuickActions(
    messages,
    quickActionsDismissed,
  );
  const composerLocked = availability !== 'ready' || !isOnline;
  const promptsLocked = composerLocked || isStreaming;
  const threadContentStyle = useMemo(
    () => {
      const baseStyles = [
        styles.messageListContent,
        isCompact ? styles.messageListContentCompact : null,
      ];
      const minHeight = getChatThreadMinHeight(threadHeight);

      return minHeight !== undefined
        ? [...baseStyles, { minHeight }]
        : baseStyles;
    }, [isCompact, styles.messageListContent, styles.messageListContentCompact, threadHeight],
  );
  const listExtraData = `${pendingFeedbackId ?? ''}:${i18n.language}`;

  const handleBookingPress = useCallback((draft: ChatBookingDraft) => {
    const params: BookingSearchPrefill = {
      isRoundTrip: false,
      returnDate: '',
      passengers: draft.passengers ?? 1,
    };

    if (draft.origin) {
      params.from = draft.origin.name;
      params.originLocationCode = draft.origin.code;
    }
    if (draft.destination) {
      params.to = draft.destination.name;
      params.destinationLocationCode = draft.destination.code;
    }
    if (draft.date) params.date = draft.date;

    applySearchPrefill(params);
    navigation.navigate('Booking', {
      screen: 'CreateTicketBooking',
    });
  }, [applySearchPrefill, navigation]);

  const handleRate = useCallback((
    messageId: string,
    assistantMessageId: string,
    rating: ChatFeedbackRating,
  ) => {
    rateMessage(messageId, assistantMessageId, rating).catch(() => undefined);
  }, [rateMessage]);

  const handleRetryMessage = useCallback((assistantMessageId: string) => {
    const assistantIndex = messages.findIndex(
      (message) => message.id === assistantMessageId,
    );
    for (let index = assistantIndex - 1; index >= 0; index -= 1) {
      const candidate = messages[index];
      if (candidate?.role === 'user' && candidate.content.trim()) {
        sendMessage(candidate.content).catch(() => undefined);
        return;
      }
    }
  }, [messages, sendMessage]);

  const alignToLatest = useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  const handleThreadLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setThreadHeight((current) => (current === nextHeight ? current : nextHeight));
  }, []);

  const handleListReady = useCallback(() => {
    if (!isWelcomeOnly) {
      alignToLatest(false);
    }
  }, [alignToLatest, isWelcomeOnly]);

  useEffect(() => {
    if (isWelcomeOnly || messages.length === 0) return;
    const frame = requestAnimationFrame(() => alignToLatest(false));
    return () => cancelAnimationFrame(frame);
  }, [alignToLatest, isWelcomeOnly, messages.length]);

  const handleSend = useCallback((message: string) => {
    setQuickActionsDismissed(true);
    sendMessage(message).catch(() => undefined);
    requestAnimationFrame(() => alignToLatest(true));
  }, [alignToLatest, sendMessage, setQuickActionsDismissed]);

  const listFooter = useMemo(
    () => (
      showQuickActions
        ? (
          <ChatQuickActions
            disabled={promptsLocked}
            onSelectPrompt={handleSend}
          />
        )
        : null
    ),
    [handleSend, promptsLocked, showQuickActions],
  );

  const handleAccessPress = useCallback(() => {
    navigation.navigate('Main', {
      screen: 'Profile',
      params: { screen: 'EditProfile' },
    });
  }, [navigation]);

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderMessage = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => (
    <ChatMessageBubble
      message={item}
      isFeedbackPending={pendingFeedbackId === item.id}
      onBookingPress={handleBookingPress}
      onRate={handleRate}
      onRetry={handleRetryMessage}
    />
  ), [handleBookingPress, handleRate, handleRetryMessage, pendingFeedbackId]);

  const handleResetConversation = useCallback(() => {
    setQuickActionsDismissed(false);
    resetConversation();
  }, [resetConversation, setQuickActionsDismissed]);

  const handleNewConversation = useCallback(() => {
    const hasConversationContent = messages.some(
      (message) => message.id !== WELCOME_MESSAGE_ID,
    );
    if (!hasConversationContent) {
      handleResetConversation();
      return;
    }
    Alert.alert(
      t('chatbot.newConversationConfirmTitle'),
      t('chatbot.newConversationConfirmDescription'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('chatbot.newConversation'),
          style: 'destructive',
          onPress: handleResetConversation,
        },
      ],
    );
  }, [handleResetConversation, messages, t]);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
          onPress={handleGoBack}
          style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <View style={styles.botInfo}>
          <View style={styles.botAvatar}>
            <Image
              source={APP_LOGO}
              style={styles.botAvatarImage}
              contentFit="cover"
              transition={0}
            />
          </View>
          <View style={styles.botText}>
            <Text style={styles.botName} numberOfLines={1}>
              {t('chatbot.title')}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  composerLocked ? styles.statusDotMuted : null,
                ]}
              />
              <Text style={styles.botStatus} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('chatbot.newConversation')}
          onPress={handleNewConversation}
          style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}
        >
          <NotePencil size={21} color={theme.colors.primary} weight="bold" />
        </Pressable>
      </View>

      <View style={styles.thread} onLayout={handleThreadLayout}>
        <FlashList
          ref={listRef}
          style={styles.threadList}
          data={messages}
          extraData={listExtraData}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          renderItem={renderMessage}
          maintainVisibleContentPosition={maintainVisibleContentPosition}
          contentContainerStyle={threadContentStyle}
          ListFooterComponent={listFooter}
          onLoad={handleListReady}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </View>

      {feedbackError ? (
        <Text style={styles.feedbackError}>{feedbackError}</Text>
      ) : null}

      {availability !== 'ready' ? (
        <Pressable
          accessibilityRole="button"
          onPress={handleAccessPress}
          style={({ pressed }) => [
            styles.accessButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.accessButtonText}>
            {t('chatbot.completeProfileAction')}
          </Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        behavior="translate-with-padding"
        style={styles.composerKeyboardView}
      >
        <ChatComposer
          disabled={composerLocked}
          isStreaming={isStreaming}
          placeholder={composerPlaceholder}
          onSend={handleSend}
          onStop={stopResponse}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  composerKeyboardView: {
    flexShrink: 0,
  },
  thread: {
    flex: 1,
    minHeight: 0,
  },
  threadList: {
    flex: 1,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
  },
  headerButton: {
    ...theme.components.headerButton,
    flexShrink: 0,
  },
  botInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  botText: {
    flex: 1,
    minWidth: 0,
  },
  botAvatar: {
    width: 38,
    height: 38,
    flexShrink: 0,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous' as const,
    overflow: 'hidden' as const,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  botAvatarImage: {
    width: 38,
    height: 38,
  },
  botName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  statusRow: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    flexShrink: 0,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.success,
  },
  statusDotMuted: {
    backgroundColor: theme.colors.textTertiary,
  },
  botStatus: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  messageListContent: {
    flexGrow: 1,
    justifyContent: 'flex-end' as const,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  messageListContentCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  feedbackError: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    textAlign: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
  },
  accessButton: {
    alignSelf: 'center' as const,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  accessButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});