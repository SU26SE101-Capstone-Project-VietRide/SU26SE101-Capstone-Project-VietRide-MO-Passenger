import React, { useCallback, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  Alert,
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
import {
  ArrowLeft,
  CurrencyCircleDollar,
  NotePencil,
  Robot,
  ShieldCheck,
} from 'phosphor-react-native';

import type { RootStackParamList } from '@app/navigation/types';
import { useBookingStore } from '@features/booking/store/useBookingStore';
import type { BookingSearchPrefill } from '@features/booking/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { ChatComposer, ChatMessageBubble } from '../components';
import { useChatSession } from '../hooks/useChatSession';
import { useChatSessionStore } from '../store/useChatSessionStore';
import type {
  ChatBookingDraft,
  ChatFeedbackRating,
  ChatMessage,
} from '../types/chatbot';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chatbot'>;
interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon: React.ComponentType<{ size: number; color: string; weight?: 'regular' | 'fill' | 'bold' }>;
}

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
  const quickActionsDismissed = useChatSessionStore((state) => state.quickActionsDismissed);
  const setQuickActionsDismissed = useChatSessionStore((state) => state.setQuickActionsDismissed);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
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

  const quickActions = useMemo<QuickAction[]>(() => [
    {
      id: 'policy',
      label: t('chatbot.quickActions.refund'),
      prompt: t('chatbot.prompts.refund'),
      icon: ShieldCheck,
    },
    {
      id: 'ticketRefund',
      label: t('chatbot.quickActions.ticketRefund'),
      prompt: t('chatbot.prompts.ticketRefund'),
      icon: CurrencyCircleDollar,
    },
  ], [t]);

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
    const assistantIndex = messages.findIndex((message) => message.id === assistantMessageId);
    for (let index = assistantIndex - 1; index >= 0; index -= 1) {
      const candidate = messages[index];
      if (candidate?.role === 'user' && candidate.content.trim()) {
        sendMessage(candidate.content).catch(() => undefined);
        return;
      }
    }
  }, [messages, sendMessage]);

  const handleSend = useCallback((message: string) => {
    setQuickActionsDismissed(true);
    sendMessage(message).catch(() => undefined);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [sendMessage]);

  const handleAccessPress = useCallback(() => {
    navigation.navigate('Main', {
      screen: 'Profile',
      params: { screen: 'EditProfile' },
    });
  }, [navigation]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    if (availability !== 'ready' || !isOnline || isStreaming) return;
    handleSend(action.prompt);
  }, [availability, handleSend, isOnline, isStreaming]);

  const renderMessage = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => (
    <ChatMessageBubble
      message={item}
      isFeedbackPending={Boolean(pendingFeedbackId)}
      onBookingPress={handleBookingPress}
      onRate={handleRate}
      onRetry={handleRetryMessage}
    />
  ), [handleBookingPress, handleRate, handleRetryMessage, pendingFeedbackId]);

  const handleResetConversation = useCallback(() => {
    setQuickActionsDismissed(false);
    resetConversation();
  }, [resetConversation]);

  const handleNewConversation = useCallback(() => {
    const hasConversationContent = messages.some((message) => message.id !== 'welcome');
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

  const listExtraData = useMemo(
    () => ({ pendingFeedbackId, language: i18n.language }),
    [i18n.language, pendingFeedbackId],
  );
  const showQuickActions = Boolean(
    !quickActionsDismissed
    && messages.length === 1
    && messages[0]?.id === 'welcome',
  );

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
          onPress={() => navigation.goBack()}
          style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <View style={styles.botInfo}>
          <View style={styles.botAvatar}>
            <Robot size={20} color={theme.colors.textInverse} weight="fill" />
          </View>
          <View>
            <Text style={styles.botName}>{t('chatbot.title')}</Text>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                !isOnline || availability !== 'ready' ? styles.statusDotMuted : null,
              ]} />
              <Text style={styles.botStatus}>{statusLabel}</Text>
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

      <FlashList
        ref={listRef}
        style={styles.messageList}
        data={messages}
        extraData={listExtraData}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        renderItem={renderMessage}
        maintainVisibleContentPosition={maintainVisibleContentPosition}
        contentContainerStyle={styles.messageListContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListFooterComponent={showQuickActions ? (
          <View style={styles.quickActionsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickActionsContent}
            >
              {quickActions.map((action) => {
                const Icon = action.icon;
                const isPromptDisabled = availability !== 'ready' || !isOnline || isStreaming;

                return (
                  <Pressable
                    key={action.id}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    accessibilityState={{ disabled: isPromptDisabled }}
                    disabled={isPromptDisabled}
                    onPress={() => handleQuickAction(action)}
                    style={({ pressed }) => [
                      styles.quickAction,
                      isPromptDisabled ? styles.quickActionDisabled : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <Icon size={16} color={theme.colors.primary} weight="bold" />
                    <Text style={styles.quickActionLabel}>{action.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      />

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
          <Text style={styles.accessButtonText}>{t('chatbot.completeProfileAction')}</Text>
        </Pressable>
      ) : null}

      <KeyboardAvoidingView behavior="padding" style={styles.composerKeyboardView}>
        <ChatComposer
          disabled={availability !== 'ready' || !isOnline}
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
  messageList: {
    flex: 1,
    minHeight: 0,
  },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botAvatar: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: spacing.sm,
  },
  botName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.success,
  },
  statusDotMuted: {
    backgroundColor: theme.colors.textTertiary,
  },
  botStatus: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  messageListContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
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
    backgroundColor: theme.colors.primary,
  },
  accessButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  quickActionsContainer: {
    paddingBottom: spacing.lg,
  },
  quickActionsContent: {
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  quickAction: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.effects.glassSurface,
  },
  quickActionDisabled: {
    opacity: 0.4,
  },
  quickActionLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
