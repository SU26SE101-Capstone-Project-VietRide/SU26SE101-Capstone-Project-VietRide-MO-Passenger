import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Package, SignIn, Tag, Ticket, Van } from 'phosphor-react-native';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import {
  useFloatingTabBarContentInset,
  useTabBarScrollBehavior,
  useThemedStyles,
} from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { toIntlLocale } from '@shared/utils/format';
import type { RootStackParamList } from '@app/navigation/types';
import {
  notificationKeys,
  type NotificationItemDto,
} from '../api/notificationApi';
import {
  DEFAULT_NOTIFICATION_LIST_PARAMS,
  flattenNotificationPages,
  trimNotificationInfiniteToFirstPage,
  useMarkAllNotificationsRead,
  useNotificationUnreadCount,
  useNotifications,
} from '../hooks/useNotifications';
import {
  formatNotificationRelativeTime,
  getNotificationKind,
} from '../utils/notificationPresentation';

type NotificationNavigation = NativeStackNavigationProp<RootStackParamList>;

interface NotificationRowProps {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  onPress: (id: string) => void;
}

const NotificationRow = memo(function NotificationRowView({
  id,
  type,
  title,
  body,
  createdAt,
  readAt,
  onPress,
}: NotificationRowProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const kind = getNotificationKind(type);
  const isUnread = !readAt;
  const intlLocale = toIntlLocale(i18n.resolvedLanguage);
  const relativeTime = useMemo(
    () => formatNotificationRelativeTime(createdAt, t, intlLocale),
    [createdAt, intlLocale, t],
  );

  const meta = (() => {
    switch (kind) {
      case 'trip':
        return {
          icon: <Ticket size={20} color={theme.colors.primary} weight="fill" />,
          bg: theme.colors.primaryFaded,
          accent: theme.colors.primary,
        };
      case 'parcel':
        return {
          icon: <Package size={20} color={theme.colors.success} weight="fill" />,
          bg: theme.colors.successLight,
          accent: theme.colors.success,
        };
      case 'shuttle':
        return {
          icon: <Van size={20} color={theme.colors.primary} weight="fill" />,
          bg: theme.colors.primaryFaded,
          accent: theme.colors.primary,
        };
      case 'promo':
        return {
          icon: <Tag size={20} color={theme.colors.warning} weight="fill" />,
          bg: theme.colors.warningLight,
          accent: theme.colors.warning,
        };
      default:
        return {
          icon: <Bell size={20} color={theme.colors.textSecondary} weight="fill" />,
          bg: theme.colors.surfaceAlt,
          accent: theme.colors.primary,
        };
    }
  })();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('notification.itemAccessibility', {
        title,
        body,
        time: relativeTime,
        state: isUnread ? t('notification.unread') : t('notification.read'),
      })}
      style={({ pressed }) => [
        styles.notificationRow,
        isUnread ? styles.unreadRow : null,
        pressed ? styles.pressedRow : null,
      ]}
      onPress={() => onPress(id)}
    >
      <View style={styles.avatarColumn}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isUnread
                ? meta.bg
                : theme.effects.isLiquid
                  ? theme.effects.contentSurfaceSoft
                  : theme.colors.surfaceAlt,
            },
          ]}
        >
          {meta.icon}
        </View>
      </View>

      <View style={styles.messageContent}>
        <View style={styles.messageTopLine}>
          <Text
            style={[
              styles.cardTitle,
              isUnread ? styles.cardTitleUnread : styles.cardTitleRead,
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.cardTime, isUnread ? styles.cardTimeUnread : null]}>
            {relativeTime}
          </Text>
        </View>

        <Text
          style={[
            styles.cardBody,
            isUnread ? styles.cardBodyUnread : styles.cardBodyRead,
          ]}
          numberOfLines={2}
        >
          {body}
        </Text>
      </View>

      <View style={styles.trailingColumn}>
        {isUnread ? (
          <View style={[styles.unreadDot, { backgroundColor: meta.accent }]} />
        ) : null}
      </View>
    </Pressable>
  );
});

export function NotificationScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NotificationNavigation>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { width: viewportWidth } = useWindowDimensions();
  const isNarrowHeader = viewportWidth < 380;
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const isGuest = useAuthStore((state) => state.isGuest);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const bottomTabClearance = useFloatingTabBarContentInset();
  const notificationsQuery = useNotifications(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const unreadCountQuery = useNotificationUnreadCount();
  const markAllMutation = useMarkAllNotificationsRead(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const {
    data: notificationsData,
    error: notificationsError,
    isError: isNotificationsError,
    isLoading: isNotificationsLoading,
    isRefetching: isNotificationsRefetching,
    isFetchingNextPage,
    hasNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch: refetchNotifications,
  } = notificationsQuery;
  const {
    mutate: markAllRead,
    isPending: isMarkingAll,
    isError: isMarkAllError,
    error: markAllError,
    reset: resetMarkAll,
  } = markAllMutation;

  const notifications = useMemo(
    () => flattenNotificationPages(notificationsData),
    [notificationsData],
  );
  // Ref keeps press handler stable so memoized rows do not rerender on every page patch.
  const notificationsRef = useRef(notifications);
  notificationsRef.current = notifications;

  const unreadCount = unreadCountQuery.data ?? 0;
  const isInitialLoading = isNotificationsLoading && notifications.length === 0;
  const isRefreshing = isNotificationsRefetching && !isFetchingNextPage;
  const listQueryKey = notificationKeys.list(
    userId ?? 'none',
    DEFAULT_NOTIFICATION_LIST_PARAMS,
  );

  const handleRefresh = useCallback(() => {
    // Bound refresh cost: drop cached pages beyond the first, then refetch once.
    trimNotificationInfiniteToFirstPage(queryClient, listQueryKey);
    refetchNotifications().catch(() => undefined);
    unreadCountQuery.refetch().catch(() => undefined);
    resetMarkAll();
  }, [listQueryKey, queryClient, refetchNotifications, resetMarkAll, unreadCountQuery]);

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchNextPageError) {
      return;
    }
    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage, hasNextPage, isFetchNextPageError, isFetchingNextPage]);

  const handleRetryNextPage = useCallback(() => {
    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage]);

  const handleNotificationPress = useCallback((id: string) => {
    const item = notificationsRef.current.find(
      (notification) => notification.id === id,
    );
    if (!item) {
      return;
    }

    navigation.navigate('NotificationDetail', { notification: item });
  }, [navigation]);

  const handleSignIn = useCallback(() => {
    navigation.navigate('Auth', { screen: 'Login' });
  }, [navigation]);

  const handleMarkAllRead = useCallback(() => {
    if (unreadCount <= 0 || isMarkingAll) return;
    resetMarkAll();
    markAllRead();
  }, [isMarkingAll, markAllRead, resetMarkAll, unreadCount]);

  const renderNotificationItem = useCallback(
    ({ item }: { item: NotificationItemDto }) => (
      <NotificationRow
        id={item.id}
        type={item.type}
        title={item.title}
        body={item.body}
        createdAt={item.createdAt}
        readAt={item.readAt}
        onPress={handleNotificationPress}
      />
    ),
    [handleNotificationPress],
  );

  const renderEmptyState = useCallback(() => {
    if (isGuest) {
      return (
        <View style={styles.emptyContainer}>
          <SignIn size={48} color={theme.colors.primary} weight="duotone" />
          <Text style={styles.emptyText}>{t('notification.signInRequired')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notification.signInAction')}
            onPress={handleSignIn}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? styles.pressedRow : null,
            ]}
          >
            <Text style={styles.retryText}>{t('notification.signInAction')}</Text>
          </Pressable>
        </View>
      );
    }

    if (isInitialLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.emptyText}>{t('notification.loading')}</Text>
        </View>
      );
    }

    if (isNotificationsError && notifications.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Bell size={48} color={theme.colors.textTertiary} weight="thin" />
          <Text style={styles.emptyText}>
            {getLocalizedApiErrorMessage(notificationsError, t)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            onPress={handleRefresh}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.pressedRow : null]}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Bell size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyText}>{t('notification.noNotifications')}</Text>
      </View>
    );
  }, [
    handleRefresh,
    handleSignIn,
    isGuest,
    isInitialLoading,
    isNotificationsError,
    notifications.length,
    notificationsError,
    styles.emptyContainer,
    styles.emptyText,
    styles.pressedRow,
    styles.retryButton,
    styles.retryText,
    t,
    theme.colors.primary,
    theme.colors.textTertiary,
  ]);

  const renderFooter = useCallback(() => {
    if (notifications.length === 0) {
      return null;
    }

    if (isFetchingNextPage) {
      return (
        <View style={styles.footerContainer}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }

    if (isFetchNextPageError && hasNextPage) {
      return (
        <View style={styles.footerContainer}>
          <Text style={styles.footerErrorText}>
            {t('notification.loadMoreFailed')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            onPress={handleRetryNextPage}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.pressedRow : null]}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      );
    }

    return <View style={styles.footerSpacer} />;
  }, [
    handleRetryNextPage,
    hasNextPage,
    isFetchNextPageError,
    isFetchingNextPage,
    notifications.length,
    styles.footerContainer,
    styles.footerErrorText,
    styles.footerSpacer,
    styles.pressedRow,
    styles.retryButton,
    styles.retryText,
    t,
    theme.colors.primary,
  ]);

  const keyExtractor = useCallback((item: NotificationItemDto) => item.id, []);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={[styles.header, isNarrowHeader ? styles.headerStacked : null]}>
        <View style={styles.headerLeft}>
          <Bell size={24} color={theme.colors.textPrimary} style={styles.headerIcon} />
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {t('notification.title')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={2}>
              {isGuest
                ? t('notification.signInSubtitle')
                : unreadCount > 0
                ? t('notification.unreadCount', { count: unreadCount })
                : t('notification.allCaughtUp')}
            </Text>
          </View>
        </View>
        {unreadCount > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('notification.markAllRead')}
            accessibilityState={{ busy: isMarkingAll, disabled: isMarkingAll }}
            disabled={isMarkingAll}
            onPress={handleMarkAllRead}
            hitSlop={8}
            style={({ pressed }) => [
              styles.markAllButton,
              isNarrowHeader ? styles.markAllButtonWide : null,
              pressed ? styles.pressedRow : null,
              isMarkingAll ? styles.markAllButtonDisabled : null,
            ]}
          >
            {isMarkingAll ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.markAllText} numberOfLines={2}>
                {t('notification.markAllShort')}
              </Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {isMarkAllError ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.retry')}
          onPress={handleMarkAllRead}
          style={({ pressed }) => [
            styles.markAllErrorBanner,
            pressed ? styles.pressedRow : null,
          ]}
        >
          <Text style={styles.markAllErrorText}>
            {getLocalizedApiErrorMessage(markAllError, t)}
          </Text>
          <Text style={styles.markAllErrorRetry}>{t('common.retry')}</Text>
        </Pressable>
      ) : null}

      <FlashList
        data={notifications}
        keyExtractor={keyExtractor}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 ? styles.emptyListContent : null,
          { paddingBottom: bottomTabClearance },
        ]}
        onRefresh={isGuest ? undefined : handleRefresh}
        refreshing={isRefreshing}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        onScroll={handleTabBarScroll}
        scrollEventThrottle={16}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.contentBorder,
  },
  headerStacked: {
    flexDirection: 'column' as const,
    alignItems: 'stretch' as const,
  },
  markAllButton: {
    flexShrink: 0,
    maxWidth: 120,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 36,
  },
  markAllButtonWide: {
    maxWidth: '100%' as unknown as number,
    alignSelf: 'flex-start' as const,
  },
  markAllButtonDisabled: {
    opacity: 0.6,
  },
  markAllText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
    textAlign: 'center' as const,
  },
  markAllErrorBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.errorLight,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  markAllErrorText: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.error,
  },
  markAllErrorRetry: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  headerLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
    minWidth: 0,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  retryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  footerContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  footerErrorText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  footerSpacer: {
    height: spacing.md,
  },
  notificationRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  unreadRow: {
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  pressedRow: {
    opacity: 0.85,
  },
  avatarColumn: {
    paddingTop: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  messageTopLine: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
  },
  cardTitleUnread: {
    color: theme.colors.textPrimary,
  },
  cardTitleRead: {
    color: theme.colors.textSecondary,
  },
  cardTime: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  cardTimeUnread: {
    color: theme.colors.primary,
  },
  cardBody: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
  },
  cardBodyUnread: {
    color: theme.colors.textSecondary,
  },
  cardBodyRead: {
    color: theme.colors.textTertiary,
  },
  trailingColumn: {
    width: 12,
    alignItems: 'center' as const,
    paddingTop: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: borderRadius.full,
  },
});
