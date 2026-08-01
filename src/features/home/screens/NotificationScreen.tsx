import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Bell, Check, Package, Tag, Ticket, Van } from 'phosphor-react-native';

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
import type { NotificationItemDto } from '../api/notificationApi';
import {
  DEFAULT_NOTIFICATION_LIST_PARAMS,
  useMarkNotificationRead,
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
      accessibilityLabel={t('notification.itemAccessibility', { title })}
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
  const handleTabBarScroll = useTabBarScrollBehavior();
  const bottomTabClearance = useFloatingTabBarContentInset();
  const notificationsQuery = useNotifications(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const markReadMutation = useMarkNotificationRead(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const {
    data: notificationsData,
    error: notificationsError,
    isError: isNotificationsError,
    isLoading: isNotificationsLoading,
    isRefetching: isNotificationsRefetching,
    refetch: refetchNotifications,
  } = notificationsQuery;
  const {
    isPending: isMarkReadPending,
    mutate: markRead,
  } = markReadMutation;

  const notifications = useMemo(
    () => notificationsData?.items ?? [],
    [notificationsData?.items],
  );
  const unreadItems = useMemo(
    () => notifications.filter((item) => !item.readAt),
    [notifications],
  );
  const unreadCount = unreadItems.length;
  const handleMarkAllRead = useCallback(() => {
    markRead(unreadItems.map((item) => item.id));
  }, [markRead, unreadItems]);

  const handleRefresh = useCallback(() => {
    refetchNotifications().catch(() => undefined);
  }, [refetchNotifications]);

  const handleNotificationPress = useCallback((id: string) => {
    const item = notifications.find((notification) => notification.id === id);
    if (!item) {
      return;
    }

    navigation.navigate('NotificationDetail', { notification: item });
  }, [navigation, notifications]);

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
    if (isNotificationsLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.emptyText}>{t('notification.loading')}</Text>
        </View>
      );
    }

    if (isNotificationsError) {
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
    isNotificationsError,
    isNotificationsLoading,
    notificationsError,
    handleRefresh,
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
            <Text style={styles.headerTitle}>{t('notification.title')}</Text>
            <Text style={styles.headerSubtitle}>
              {unreadCount > 0
                ? t('notification.unreadCount', { count: unreadCount })
                : t('notification.allCaughtUp')}
            </Text>
          </View>
        </View>

        {notifications.length > 0 ? (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('notification.markAllRead')}
              onPress={handleMarkAllRead}
              disabled={unreadCount === 0 || isMarkReadPending}
              style={[
                styles.actionButton,
                unreadCount === 0 ? styles.actionButtonDisabled : null,
              ]}
            >
              {isMarkReadPending ? (
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
        onRefresh={handleRefresh}
        refreshing={isNotificationsRefetching}
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
      ? theme.effects.glassTint
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
