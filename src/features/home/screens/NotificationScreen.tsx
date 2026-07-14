import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Package, Tag, Ticket } from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useTabBarScrollBehavior, useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';
import { getApiErrorMessage } from '@shared/api/errors';
import { isUuid } from '@shared/utils/pathSegment';
import { formatShortDate } from '@shared/utils/format';
import type { NotificationItemDto } from '../api/notificationApi';
import { useMarkNotificationRead, useNotifications } from '../hooks/useNotifications';

type NotificationKind = 'trip' | 'parcel' | 'promo' | 'notification';

const NOTIFICATION_BOTTOM_CONTENT_GAP = spacing.huge;
const NOTIFICATION_QUERY_PARAMS = {
  unreadOnly: false,
  page: 1,
  pageSize: 30,
  sortBy: 'createdAt' as const,
  sortDir: 'desc' as const,
};

const notificationKind = (type: string): NotificationKind => {
  if (type.startsWith('PARCEL_')) {
    return 'parcel';
  }
  if (type.includes('VOUCHER') || type.includes('SUBSCRIPTION')) {
    return 'promo';
  }
  if (type.startsWith('BOOKING_') || type.startsWith('TRIP_') || type.startsWith('STOP_')) {
    return 'trip';
  }

  return 'notification';
};

const formatRelativeTime = (dateLike: string): string => {
  const date = new Date(dateLike);
  const diffMs = Date.now() - date.getTime();

  if (Number.isNaN(date.getTime()) || diffMs < 0) {
    return '';
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  return formatShortDate(date);
};

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
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const kind = notificationKind(type);
  const isUnread = !readAt;

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
                  ? theme.effects.glassSurfaceSoft
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
            {formatRelativeTime(createdAt)}
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
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleTabBarScroll = useTabBarScrollBehavior();
  const notificationsQuery = useNotifications(NOTIFICATION_QUERY_PARAMS);
  const markReadMutation = useMarkNotificationRead(NOTIFICATION_QUERY_PARAMS);

  const notifications = useMemo(
    () => notificationsQuery.data?.items ?? [],
    [notificationsQuery.data?.items],
  );
  const unreadItems = useMemo(
    () => notifications.filter((item) => !item.readAt),
    [notifications],
  );
  const unreadCount = unreadItems.length;
  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + NOTIFICATION_BOTTOM_CONTENT_GAP;

  const handleMarkAllRead = useCallback(() => {
    markReadMutation.mutate(unreadItems.map((item) => item.id));
  }, [markReadMutation, unreadItems]);

  const handleNotificationPress = useCallback((id: string) => {
    const item = notifications.find((notification) => notification.id === id);
    if (!item) {
      return;
    }

    if (!item.readAt) {
      markReadMutation.mutate(id);
    }

    const parcelId = item.data?.parcelId;
    if (isUuid(parcelId) && notificationKind(item.type) === 'parcel') {
      navigation.navigate('Parcel', {
        screen: 'ParcelDetail',
        params: { parcelId, fromHistory: true },
      });
    }
  }, [markReadMutation, navigation, notifications]);

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
    if (notificationsQuery.isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.emptyText}>Loading notifications...</Text>
        </View>
      );
    }

    if (notificationsQuery.isError) {
      return (
        <View style={styles.emptyContainer}>
          <Bell size={48} color={theme.colors.textTertiary} weight="thin" />
          <Text style={styles.emptyText}>{getApiErrorMessage(notificationsQuery.error)}</Text>
          <Pressable
            onPress={() => notificationsQuery.refetch()}
            style={({ pressed }) => [styles.retryButton, pressed ? styles.pressedRow : null]}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Bell size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyText}>{t('notification.noNotifications', 'No notifications yet.')}</Text>
      </View>
    );
  }, [
    notificationsQuery,
    styles.emptyContainer,
    styles.emptyText,
    styles.pressedRow,
    styles.retryButton,
    styles.retryText,
    t,
    theme.colors.primary,
    theme.colors.textTertiary,
  ]);

  const keyExtractor = useCallback((item: NotificationItemDto) => item.id, []);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={24} color={theme.colors.textPrimary} style={styles.headerIcon} />
          <View>
            <Text style={styles.headerTitle}>{t('profile.notifications', 'Notifications')}</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0
                ? t('notification.unreadCount', '{{count}} unread', { count: unreadCount })
                : t('notification.allCaughtUp', 'All caught up')}
            </Text>
          </View>
        </View>

        {notifications.length > 0 ? (
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0 || markReadMutation.isPending}
              style={[
                styles.actionButton,
                unreadCount === 0 ? styles.actionButtonDisabled : null,
              ]}
            >
              {markReadMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Check size={18} color={unreadCount === 0 ? theme.colors.textDisabled : theme.colors.primary} />
              )}
            </Pressable>
          </View>
        ) : null}
      </View>

      <FlashList
        data={notifications}
        keyExtractor={keyExtractor}
        renderItem={renderNotificationItem}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          notifications.length === 0 ? styles.emptyListContent : null,
          { paddingBottom: bottomTabClearance },
        ]}
        onRefresh={notificationsQuery.refetch}
        refreshing={notificationsQuery.isRefetching}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: theme.colors.textPrimary,
  },
  headerSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    marginTop: spacing.xxs,
  },
  headerActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    paddingVertical: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: theme.colors.textTertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing.md,
    minWidth: 112,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 82,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.transparent,
    backgroundColor: theme.colors.transparent,
  },
  unreadRow: {
    backgroundColor: theme.effects.isLiquid
      ? theme.isDark
        ? 'rgba(85, 241, 232, 0.13)'
        : 'rgba(0, 125, 120, 0.09)'
      : theme.colors.primaryFaded,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorderStrong : theme.colors.primaryFaded,
  },
  pressedRow: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  avatarColumn: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    flexShrink: 0,
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  messageTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xxs,
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: fontSizes.md,
    flex: 1,
  },
  cardTitleRead: {
    fontFamily: fontFamilies.semiBold,
    color: theme.colors.textSecondary,
  },
  cardTitleUnread: {
    fontFamily: fontFamilies.bold,
    color: theme.colors.textPrimary,
  },
  cardTime: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  cardTimeUnread: {
    fontFamily: fontFamilies.bold,
    color: theme.colors.primary,
  },
  cardBody: {
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  cardBodyRead: {
    fontFamily: fontFamilies.regular,
    color: theme.colors.textTertiary,
  },
  cardBodyUnread: {
    fontFamily: fontFamilies.medium,
    color: theme.colors.textSecondary,
  },
  trailingColumn: {
    width: 18,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: borderRadius.full,
  },
});
