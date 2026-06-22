import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StatusBar,
} from 'react-native';
import type { ListRenderItem } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Bell, Ticket, Package, Tag, Check, Trash } from 'phosphor-react-native';

import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';
import { CUSTOM_TAB_BAR_BASE_HEIGHT } from '@shared/components/CustomTabBar';

type NotificationType = 'trip' | 'parcel' | 'promo';

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  time: string;
  isUnread: boolean;
}

const NOTIFICATION_BOTTOM_CONTENT_GAP = spacing.huge;

export function NotificationScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: '1',
      type: 'trip',
      title: t('notification.tripDepartingTitle', 'Trip Departing Soon'),
      body: t('notification.tripDepartingBody', 'Your bus VR-88291 to Da Lat is departing in 30 mins. Please proceed to platform A04.'),
      time: '10m ago',
      isUnread: true,
    },
    {
      id: '2',
      type: 'parcel',
      title: t('notification.parcelDeliveredTitle', 'Parcel Delivered'),
      body: t('notification.parcelDeliveredBody', 'Your package #VR-P3891 has been successfully received at Da Lat terminal.'),
      time: '2h ago',
      isUnread: true,
    },
    {
      id: '3',
      type: 'promo',
      title: t('notification.promoTitle', 'Summer Escapes: 20% Off'),
      body: t('notification.promoBody', 'Get immediate discount on VIP sleeper limousine routes this week! Use code SUMMER20.'),
      time: '1d ago',
      isUnread: false,
    },
    {
      id: '4',
      type: 'trip',
      title: t('notification.ticketConfirmedTitle', 'Booking Confirmed'),
      body: t('notification.ticketConfirmedBody', 'Seat A03 is booked for your trip from HCMC to Da Lat on June 5, 2026.'),
      time: '3d ago',
      isUnread: false,
    },
  ]);

  const unreadCount = useMemo(
    () => notifications.reduce((count, item) => count + (item.isUnread ? 1 : 0), 0),
    [notifications],
  );
  const bottomTabClearance =
    CUSTOM_TAB_BAR_BASE_HEIGHT + Math.max(insets.bottom, spacing.sm) + NOTIFICATION_BOTTOM_CONTENT_GAP;

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isUnread: false })));
  }, []);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleNotificationPress = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id && item.isUnread ? { ...item, isUnread: false } : item)),
    );
  }, []);

  const getIconMeta = useCallback((type: NotificationType) => {
    switch (type) {
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
    }
  }, [theme.colors.primary, theme.colors.primaryFaded, theme.colors.success, theme.colors.successLight, theme.colors.warning, theme.colors.warningLight]);

  const renderNotificationItem = useCallback<ListRenderItem<NotificationItem>>(
    ({ item }) => {
      const meta = getIconMeta(item.type);

      return (
        <Pressable
          style={({ pressed }) => [
            styles.notificationRow,
            item.isUnread ? styles.unreadRow : null,
            pressed ? styles.pressedRow : null,
          ]}
          onPress={() => handleNotificationPress(item.id)}
        >
          <View style={styles.avatarColumn}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: item.isUnread
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
                  item.isUnread ? styles.cardTitleUnread : styles.cardTitleRead,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[styles.cardTime, item.isUnread ? styles.cardTimeUnread : null]}>
                {item.time}
              </Text>
            </View>

            <Text
              style={[
                styles.cardBody,
                item.isUnread ? styles.cardBodyUnread : styles.cardBodyRead,
              ]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
          </View>

          <View style={styles.trailingColumn}>
            {item.isUnread ? (
              <View style={[styles.unreadDot, { backgroundColor: meta.accent }]} />
            ) : null}
          </View>
        </Pressable>
      );
    },
    [getIconMeta, handleNotificationPress, styles, theme.colors.surfaceAlt, theme.effects.glassSurfaceSoft, theme.effects.isLiquid],
  );

  const renderEmptyState = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Bell size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyText}>{t('notification.noNotifications', 'No notifications yet.')}</Text>
      </View>
    ),
    [styles.emptyContainer, styles.emptyText, t, theme.colors.textTertiary],
  );

  const keyExtractor = useCallback((item: NotificationItem) => item.id, []);

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Header */}
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
              disabled={unreadCount === 0}
              style={[
                styles.actionButton,
                unreadCount === 0 ? styles.actionButtonDisabled : null,
              ]}
            >
              <Check size={18} color={unreadCount === 0 ? theme.colors.textDisabled : theme.colors.primary} />
            </Pressable>
            <Pressable onPress={handleClearAll} style={styles.actionButton}>
              <Trash size={18} color={theme.colors.error} />
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* List */}
      <FlatList
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
        contentInsetAdjustmentBehavior="automatic"
        scrollIndicatorInsets={{ bottom: bottomTabClearance }}
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
