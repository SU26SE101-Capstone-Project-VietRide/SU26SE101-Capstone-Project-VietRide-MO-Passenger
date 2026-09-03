import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Package, Tag, Ticket, Van } from 'phosphor-react-native';

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
import { getNotificationNavigationIntent } from '@shared/notifications/notificationAction';
import {
  DEFAULT_NOTIFICATION_LIST_PARAMS,
  flattenNotificationPages,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationUnreadCount,
  useNotifications,
} from '../hooks/useNotifications';
import {
  prepareNotificationListFocusRefetch,
  shouldRefetchNotificationQuery,
  trimNotificationInfiniteToFirstPage,
} from '../utils/notificationQueryFreshness';
import { localizeNotificationCopy } from '../utils/notificationCopy';
import {
  formatNotificationRelativeTime,
  getNotificationKind,
} from '../utils/notificationPresentation';

type NotificationNavigation = NativeStackNavigationProp<RootStackParamList>;

const KIND_ICON = {
  trip: Ticket,
  parcel: Package,
  shuttle: Van,
  promo: Tag,
  notification: Bell,
} as const;

const notificationKeyExtractor = (item: NotificationItemDto): string => item.id;
const getNotificationItemType = (item: NotificationItemDto): string =>
  `${getNotificationKind(item.type)}:${item.readAt ? 'read' : 'unread'}`;

interface NotificationRowProps {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  createdAt: string;
  readAt: string | null;
  onPress: (id: string) => void;
}

const NotificationRow = memo(function NotificationRowView({
  id,
  type,
  title,
  body,
  data,
  createdAt,
  readAt,
  onPress,
}: NotificationRowProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const kind = getNotificationKind(type);
  const isUnread = readAt === null;
  const KindIcon = KIND_ICON[kind];
  const intlLocale = toIntlLocale(i18n.resolvedLanguage);
  const copy = useMemo(
    () => localizeNotificationCopy({ type, title, body, data }, t),
    [body, data, t, title, type],
  );
  const relativeTime = useMemo(
    () => formatNotificationRelativeTime(createdAt, t, intlLocale),
    [createdAt, intlLocale, t],
  );
  const handlePress = useCallback(() => {
    onPress(id);
  }, [id, onPress]);
  const iconColor = kind === 'parcel'
    ? theme.colors.success
    : kind === 'promo'
      ? theme.colors.warningForeground
      : kind === 'notification'
        ? theme.colors.textSecondary
        : theme.colors.primary;
  const iconBackgroundStyle = isUnread
    ? kind === 'parcel'
      ? styles.iconBgParcel
      : kind === 'promo'
        ? styles.iconBgPromo
        : kind === 'notification'
          ? styles.iconBgDefault
          : styles.iconBgTrip
    : styles.iconBgRead;
  const unreadDotStyle = kind === 'parcel'
    ? styles.unreadDotParcel
    : kind === 'promo'
      ? styles.unreadDotPromo
      : styles.unreadDotDefault;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('notification.itemAccessibility', {
        title: copy.title,
        body: copy.body,
        time: relativeTime,
        state: isUnread ? t('notification.unread') : t('notification.read'),
      })}
      style={({ pressed }) => [
        styles.notificationRow,
        isUnread ? styles.unreadRow : null,
        pressed ? styles.pressedRow : null,
      ]}
      onPress={handlePress}
    >
      <View style={styles.avatarColumn}>
        <View style={[styles.iconContainer, iconBackgroundStyle]}>
          <KindIcon size={20} color={iconColor} weight="fill" />
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
            {copy.title}
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
          {copy.body}
        </Text>
      </View>

      <View style={styles.trailingColumn}>
        {isUnread ? <View style={[styles.unreadDot, unreadDotStyle]} /> : null}
      </View>
    </Pressable>
  );
});

export function NotificationScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation<NotificationNavigation>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.user?.id);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const bottomTabClearance = useFloatingTabBarContentInset();
  const notificationsQuery = useNotifications(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const unreadCountQuery = useNotificationUnreadCount();
  const markAllMutation = useMarkAllNotificationsRead(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const { mutate: markRead } = useMarkNotificationRead(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const {
    data: notificationsData,
    error: notificationsError,
    isError: isNotificationsError,
    isLoading: isNotificationsLoading,
    isFetchingNextPage,
    hasNextPage,
    isFetchNextPageError,
    fetchNextPage,
    refetch: refetchNotifications,
  } = notificationsQuery;
  const {
    refetch: refetchUnreadCount,
  } = unreadCountQuery;
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
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
  const scopedUserId = userId ?? 'none';
  const listQueryKey = useMemo(
    () => notificationKeys.list(
      scopedUserId,
      DEFAULT_NOTIFICATION_LIST_PARAMS,
    ),
    [scopedUserId],
  );
  const unreadCountKey = useMemo(
    () => notificationKeys.unreadCount(scopedUserId),
    [scopedUserId],
  );

  const handleRefresh = useCallback(() => {
    // Bound refresh cost: drop cached pages beyond the first, then refetch once.
    setIsPullRefreshing(true);
    trimNotificationInfiniteToFirstPage(queryClient, listQueryKey);
    Promise.all([
      refetchNotifications(),
      refetchUnreadCount(),
    ])
      .catch(() => undefined)
      .finally(() => {
        setIsPullRefreshing(false);
      });
    resetMarkAll();
  }, [listQueryKey, queryClient, refetchNotifications, refetchUnreadCount, resetMarkAll]);

  useFocusEffect(
    useCallback(() => {
      if (prepareNotificationListFocusRefetch(queryClient, listQueryKey)) {
        refetchNotifications().catch(() => undefined);
      }
      if (shouldRefetchNotificationQuery(queryClient, unreadCountKey)) {
        refetchUnreadCount().catch(() => undefined);
      }
    }, [
      listQueryKey,
      queryClient,
      refetchNotifications,
      refetchUnreadCount,
      unreadCountKey,
    ]),
  );

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

    const pendingIntent = getNotificationNavigationIntent(item.action, item.data);
    if (pendingIntent?.type === 'booking-pending-action') {
      if (!item.readAt) {
        markRead(item.id);
      }
      navigation.navigate('BookingPendingAction', pendingIntent.pendingAction);
      return;
    }

    navigation.navigate('NotificationDetail', { notification: item });
  }, [markRead, navigation]);

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
        data={item.data}
        createdAt={item.createdAt}
        readAt={item.readAt}
        onPress={handleNotificationPress}
      />
    ),
    [handleNotificationPress],
  );

  const renderEmptyState = useCallback(() => {
    if (isInitialLoading) {
      return (
        <View
          style={styles.notificationSkeletonList}
          accessibilityRole="summary"
          accessibilityLabel={t('notification.loading')}
        >
          {[0, 1, 2, 3, 4].map(index => (
            <View key={index} style={styles.notificationSkeletonRow}>
              <View style={[styles.notificationSkeletonBlock, styles.notificationSkeletonIcon]} />
              <View style={styles.notificationSkeletonCopy}>
                <View style={styles.notificationSkeletonTop}>
                  <View style={[styles.notificationSkeletonBlock, styles.notificationSkeletonTitle]} />
                  <View style={[styles.notificationSkeletonBlock, styles.notificationSkeletonTime]} />
                </View>
                <View style={[styles.notificationSkeletonBlock, styles.notificationSkeletonBody]} />
                <View style={[styles.notificationSkeletonBlock, styles.notificationSkeletonBodyShort]} />
              </View>
            </View>
          ))}
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
    isInitialLoading,
    isNotificationsError,
    notifications.length,
    notificationsError,
    styles.emptyContainer,
    styles.emptyText,
    styles.notificationSkeletonBlock,
    styles.notificationSkeletonBody,
    styles.notificationSkeletonBodyShort,
    styles.notificationSkeletonCopy,
    styles.notificationSkeletonIcon,
    styles.notificationSkeletonList,
    styles.notificationSkeletonRow,
    styles.notificationSkeletonTime,
    styles.notificationSkeletonTitle,
    styles.notificationSkeletonTop,
    styles.pressedRow,
    styles.retryButton,
    styles.retryText,
    t,
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

  const listBottomInset = useMemo(
    () => ({ bottom: bottomTabClearance }),
    [bottomTabClearance],
  );
  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      notifications.length === 0 ? styles.emptyListContent : null,
      Platform.OS === 'android' ? { paddingBottom: bottomTabClearance } : null,
    ],
    [
      bottomTabClearance,
      notifications.length,
      styles.emptyListContent,
      styles.listContent,
    ],
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={24} color={theme.colors.textPrimary} style={styles.headerIcon} />
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {t('notification.title')}
            </Text>
            <Text style={styles.headerSubtitle} numberOfLines={2}>
              {unreadCount > 0
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
        keyExtractor={notificationKeyExtractor}
        getItemType={getNotificationItemType}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={listContentStyle}
        contentInset={Platform.OS === 'ios' ? listBottomInset : undefined}
        scrollIndicatorInsets={listBottomInset}
        onRefresh={handleRefresh}
        refreshing={isPullRefreshing}
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
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.contentBorder,
  },
  markAllButton: {
    flexShrink: 0,
    maxWidth: 120,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 44,
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
    borderCurve: 'continuous' as const,
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
    flexBasis: 220,
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
  notificationSkeletonList: {
    width: '100%' as const,
    paddingTop: spacing.xs,
  },
  notificationSkeletonRow: {
    minHeight: 88,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xs,
  },
  notificationSkeletonBlock: {
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.skeleton,
  },
  notificationSkeletonIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
  },
  notificationSkeletonCopy: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  notificationSkeletonTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
  },
  notificationSkeletonTitle: { width: '48%' as const, height: 14 },
  notificationSkeletonTime: { width: 48, height: 11 },
  notificationSkeletonBody: { width: '92%' as const, height: 12 },
  notificationSkeletonBodyShort: { width: '62%' as const, height: 12 },
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
    borderCurve: 'continuous' as const,
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
    borderCurve: 'continuous' as const,
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
    borderCurve: 'continuous' as const,
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
  iconBgTrip: {
    backgroundColor: theme.colors.primaryFaded,
  },
  iconBgParcel: {
    backgroundColor: theme.colors.successLight,
  },
  iconBgPromo: {
    backgroundColor: theme.colors.warningLight,
  },
  iconBgDefault: {
    backgroundColor: theme.colors.surfaceAlt,
  },
  iconBgRead: {
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  unreadDotParcel: {
    backgroundColor: theme.colors.success,
  },
  unreadDotPromo: {
    backgroundColor: theme.colors.warning,
  },
  unreadDotDefault: {
    backgroundColor: theme.colors.primary,
  },
});
