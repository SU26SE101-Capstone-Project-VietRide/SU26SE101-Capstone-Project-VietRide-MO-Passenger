import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Bell, Ticket, Package, Tag, Check, Trash } from 'phosphor-react-native';

import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface NotificationItem {
  id: string;
  type: 'trip' | 'parcel' | 'promo';
  title: string;
  body: string;
  time: string;
  isUnread: boolean;
}

export function NotificationScreen(): React.JSX.Element {
  const { t } = useTranslation();

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

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isUnread: false })));
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isUnread: !item.isUnread } : item))
    );
  };

  const getIconMeta = (type: 'trip' | 'parcel' | 'promo') => {
    switch (type) {
      case 'trip':
        return {
          icon: <Ticket size={20} color="#006A67" weight="fill" />,
          bg: 'rgba(0, 106, 103, 0.10)',
          accent: '#006A67',
        };
      case 'parcel':
        return {
          icon: <Package size={20} color={colors.success} weight="fill" />,
          bg: 'rgba(34, 197, 94, 0.10)',
          accent: colors.success,
        };
      case 'promo':
        return {
          icon: <Tag size={20} color={colors.warning} weight="fill" />,
          bg: 'rgba(245, 158, 11, 0.10)',
          accent: colors.warning,
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Bell size={24} color={colors.textPrimary} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>{t('profile.notifications', 'Notifications')}</Text>
        </View>

        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionButton} activeOpacity={0.6}>
              <Check size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClearAll} style={styles.actionButton} activeOpacity={0.6}>
              <Trash size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={48} color={colors.textTertiary} weight="thin" />
            <Text style={styles.emptyText}>{t('notification.noNotifications', 'No notifications yet.')}</Text>
          </View>
        ) : (
          notifications.map((item) => {
            const meta = getIconMeta(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.notificationCard,
                  item.isUnread && styles.unreadCard,
                ]}
                onPress={() => handleToggleRead(item.id)}
                activeOpacity={0.85}
              >
                {/* Left accent stripe — only visible when unread */}
                {item.isUnread && (
                  <View style={[styles.unreadStripe, { backgroundColor: meta.accent }]} />
                )}

                <View style={styles.cardContent}>
                  {/* Type icon with colour-matched tinted background */}
                  <View style={[styles.iconContainer, { backgroundColor: meta.bg }]}>
                    {meta.icon}
                  </View>

                  <View style={styles.textContainer}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.cardTitle,
                          item.isUnread && styles.cardTitleUnread,
                        ]}
                      >
                        {item.title}
                      </Text>
                      <Text style={styles.cardTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.cardBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    color: colors.textPrimary,
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
    backgroundColor: colors.surfaceAlt,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  emptyContainer: {
    paddingVertical: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden', // clips accent stripe to card rounded corners
    ...shadows.sm,
  },
  unreadCard: {
    // Keep white background — the left stripe is the sole unread indicator
    backgroundColor: colors.surface,
  },
  unreadStripe: {
    width: 4,
    alignSelf: 'stretch', // fills full card height automatically
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    flexShrink: 0,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  cardTitleUnread: {
    fontFamily: fontFamilies.bold,
  },
  cardTime: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
  },
  cardBody: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
