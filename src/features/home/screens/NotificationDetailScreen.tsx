import React, { useCallback, useEffect, useMemo } from 'react';
import { Pressable, ScrollView, StatusBar, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { ArrowLeft, MapPin, Package, Ticket, Van, Wallet } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@app/navigation/types';
import { borderRadius, fontFamilies, fontSizes, spacing, type AppTheme } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { getNotificationNavigationIntent } from '@shared/notifications/notificationAction';
import { formatDateTime, toIntlLocale } from '@shared/utils/format';
import { DEFAULT_NOTIFICATION_LIST_PARAMS, useMarkNotificationRead } from '../hooks/useNotifications';
import { localizeNotificationCopy } from '../utils/notificationCopy';
import {
  getNotificationKind,
} from '../utils/notificationPresentation';

type NotificationDetailRoute = RouteProp<RootStackParamList, 'NotificationDetail'>;
type NotificationDetailNavigation = NativeStackNavigationProp<RootStackParamList>;

export function NotificationDetailScreen(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const route = useRoute<NotificationDetailRoute>();
  const navigation = useNavigation<NotificationDetailNavigation>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { notification } = route.params;
  const { mutate: markRead } = useMarkNotificationRead(DEFAULT_NOTIFICATION_LIST_PARAMS);
  const kind = getNotificationKind(notification.type);
  const copy = useMemo(
    () => localizeNotificationCopy(notification, t),
    [notification, t],
  );
  // Pass notification.data so shuttle tracking can resolve bookingId when
  // action.params only has shuttleTripId (current BE + existing inbox rows).
  const actionIntent = useMemo(
    () => getNotificationNavigationIntent(notification.action, notification.data),
    [notification.action, notification.data],
  );

  const timestamp = useMemo(() => {
    return formatDateTime(
      notification.createdAt,
      toIntlLocale(i18n.resolvedLanguage),
    );
  }, [i18n.resolvedLanguage, notification.createdAt]);

  useEffect(() => {
    if (!notification.readAt) {
      markRead(notification.id);
    }
  }, [markRead, notification.id, notification.readAt]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleRelatedAction = useCallback(() => {
    switch (actionIntent?.type) {
      case 'booking-pending-action':
        navigation.navigate('BookingPendingAction', actionIntent.pendingAction);
        return;
      case 'booking-history':
        navigation.navigate('Main', {
          screen: 'BookingHistory',
          params: { initialTab: 'ticket' },
        });
        return;
      case 'trip-tracking':
        navigation.navigate('Tracking', {
          source: 'trip',
          tripId: actionIntent.tripId,
        });
        return;
      case 'parcel-detail':
        navigation.navigate('Parcel', {
          screen: 'ParcelDetail',
          params: { parcelId: actionIntent.parcelId, fromHistory: true },
        });
        return;
      case 'wallet':
        navigation.navigate('Main', {
          screen: 'Profile',
          params: { screen: 'Wallet' },
        });
        return;
      case 'shuttle-tracking':
        navigation.navigate('Tracking', {
          source: 'shuttle',
          shuttleTripId: actionIntent.shuttleTripId,
          ...(actionIntent.bookingId
            ? { bookingId: actionIntent.bookingId }
            : {}),
        });
    }
  }, [actionIntent, navigation]);

  const relatedActionLabel = useMemo(() => {
    switch (actionIntent?.type) {
      case 'booking-pending-action':
        return t('notification.reviewTripChange');
      case 'booking-history':
        return t('notification.viewBookingHistory');
      case 'trip-tracking':
        return t('notification.trackTrip');
      case 'parcel-detail':
        return t('notification.viewParcelDetails');
      case 'wallet':
        return t('notification.openWallet');
      case 'shuttle-tracking':
        return t('notification.trackShuttle');
      default:
        return null;
    }
  }, [actionIntent, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={10}
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('notification.detailTitle')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.typeBadge}>
          {kind === 'parcel' ? (
            <Package size={18} color={theme.colors.success} weight="fill" />
          ) : kind === 'shuttle' ? (
            <Van size={18} color={theme.colors.primary} weight="fill" />
          ) : (
            <Ticket size={18} color={theme.colors.primary} weight="fill" />
          )}
          <Text style={styles.typeLabel}>
            {kind === 'parcel'
              ? t('notification.parcelUpdate')
              : kind === 'shuttle'
                ? t('notification.shuttleUpdate')
                : t('notification.vietRideUpdate')}
          </Text>
        </View>

        <Text style={styles.title}>{copy.title}</Text>
        {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}

        <View style={styles.messageCard}>
          <Text style={styles.message}>{copy.body}</Text>
        </View>

        {actionIntent && relatedActionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={relatedActionLabel}
            onPress={handleRelatedAction}
            style={({ pressed }) => [styles.relatedAction, pressed ? styles.pressed : null]}
          >
            {actionIntent.type === 'parcel-detail' ? (
              <Package size={20} color={theme.colors.textInverse} weight="fill" />
            ) : actionIntent.type === 'shuttle-tracking' ? (
              <Van size={20} color={theme.colors.textInverse} weight="fill" />
            ) : actionIntent.type === 'trip-tracking' ? (
              <MapPin size={20} color={theme.colors.textInverse} weight="fill" />
            ) : actionIntent.type === 'wallet' ? (
              <Wallet size={20} color={theme.colors.textInverse} weight="fill" />
            ) : (
              <Ticket size={20} color={theme.colors.textInverse} weight="fill" />
            )}
            <Text style={styles.relatedActionLabel}>{relatedActionLabel}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    alignItems: 'center',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    alignItems: 'center',
    borderRadius: borderRadius.full,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  headerSpacer: { width: 36 },
  headerTitle: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
  },
  content: { padding: spacing.xl },
  typeBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  typeLabel: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    lineHeight: 32,
    marginTop: spacing.lg,
  },
  timestamp: {
    color: theme.colors.textTertiary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    marginTop: spacing.sm,
  },
  messageCard: {
    ...theme.components.card,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  message: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: 24,
  },
  relatedAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: borderRadius.lg,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
  },
  relatedActionLabel: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});
