import React, { useCallback, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
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
  MapPin,
  NotePencil,
  Package,
  Robot,
  ShieldCheck,
  Ticket,
} from 'phosphor-react-native';

import type { RootStackParamList } from '@app/navigation/types';
import { useAuthStore } from '@features/auth/store/useAuthStore';
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
import type {
  ChatBookingDraft,
  ChatFeedbackRating,
  ChatMessage,
} from '../types/chatbot';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Chatbot'>;
interface QuickAction {
  id: 'policy' | 'booking' | 'history' | 'parcel';
  label: string;
  prompt?: string;
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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const applySearchPrefill = useBookingStore((state) => state.applySearchPrefill);
  const resetAuthState = useAuthStore((state) => state.resetAuthState);
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
      id: 'booking',
      label: t('chatbot.quickActions.booking'),
      icon: Ticket,
    },
    {
      id: 'history',
      label: t('chatbot.quickActions.tracking'),
      icon: MapPin,
    },
    {
      id: 'parcel',
      label: t('chatbot.quickActions.parcel'),
      icon: Package,
    },
  ], [t]);

  const statusLabel = useMemo(() => {
    if (!isOnline) return t('chatbot.offline');
    if (isStreaming) return t('chatbot.responding');
    if (availability === 'guest') return t('chatbot.signInRequired');
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
      screen: draft.isReadyToSearch ? 'CreateTicketBooking' : 'SearchRoutes',
    });
  }, [applySearchPrefill, navigation]);

  const handleRate = useCallback((
    messageId: string,
    assistantMessageId: string,
    rating: ChatFeedbackRating,
  ) => {
    rateMessage(messageId, assistantMessageId, rating).catch(() => undefined);
  }, [rateMessage]);

  const handleSend = useCallback((message: string) => {
    sendMessage(message).catch(() => undefined);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [sendMessage]);

  const handleAccessPress = useCallback(() => {
    if (availability === 'guest') {
      resetAuthState();
      return;
    }

    navigation.navigate('Main', {
      screen: 'Profile',
      params: { screen: 'EditProfile' },
    });
  }, [availability, navigation, resetAuthState]);

  const handleQuickAction = useCallback((action: QuickAction) => {
    if (action.id === 'booking') {
      handleBookingPress({ isReadyToSearch: false });
    } else if (action.id === 'history') {
      navigation.navigate('Main', {
        screen: 'BookingHistory',
        params: { initialTab: 'ticket' },
      });
    } else if (action.id === 'parcel') {
      navigation.navigate('Parcel', { screen: 'CreateParcel' });
    } else if (action.prompt && availability === 'ready' && isOnline && !isStreaming) {
      handleSend(action.prompt);
    }
  }, [
    availability,
    handleBookingPress,
    handleSend,
    isOnline,
    isStreaming,
    navigation,
  ]);

  const renderMessage = useCallback(({ item }: ListRenderItemInfo<ChatMessage>) => (
    <ChatMessageBubble
      message={item}
      isFeedbackPending={Boolean(pendingFeedbackId)}
      onBookingPress={handleBookingPress}
      onRate={handleRate}
    />
  ), [handleBookingPress, handleRate, pendingFeedbackId]);

  const listExtraData = useMemo(
    () => ({ pendingFeedbackId, language: i18n.language }),
    [i18n.language, pendingFeedbackId],
  );

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={styles.keyboardView}
      >
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
            onPress={resetConversation}
            style={({ pressed }) => [styles.headerButton, pressed ? styles.pressed : null]}
          >
            <NotePencil size={21} color={theme.colors.primary} weight="bold" />
          </Pressable>
        </View>

        <FlashList
          ref={listRef}
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
            <Text style={styles.accessButtonText}>
              {availability === 'guest'
                ? t('chatbot.signInAction')
                : t('chatbot.completeProfileAction')}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.quickActionsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsContent}
          >
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isPolicyDisabled = action.id === 'policy'
                && (availability !== 'ready' || !isOnline || isStreaming);

              return (
                <Pressable
                  key={action.id}
                  disabled={isPolicyDisabled}
                  onPress={() => handleQuickAction(action)}
                  style={({ pressed }) => [
                    styles.quickAction,
                    isPolicyDisabled ? styles.quickActionDisabled : null,
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
  keyboardView: {
    flex: 1,
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
    paddingBottom: spacing.md,
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
    borderTopWidth: 1,
    borderTopColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
    paddingVertical: spacing.sm,
  },
  quickActionsContent: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  quickAction: {
    minHeight: 38,
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
