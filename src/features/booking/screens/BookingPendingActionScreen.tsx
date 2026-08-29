import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, ClockCountdown, PathIcon, WarningCircle } from 'phosphor-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import type { RootStackParamList } from '@app/navigation/types';
import { RadioOption } from '@features/booking/components/RadioOption';
import { useResolvePendingAction } from '@features/booking/hooks/useResolvePendingAction';
import {
  candidateSelectionKey,
  toResolveSelection,
  type BookingPendingActionStop,
} from '@features/booking/utils/bookingPendingAction';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDateTime, toIntlLocale } from '@shared/utils/format';

type PendingActionRoute = RouteProp<RootStackParamList, 'BookingPendingAction'>;
type PendingActionNavigation = NativeStackNavigationProp<RootStackParamList, 'BookingPendingAction'>;

const RESOLVE_ERROR_KEYS = {
  BOOKING_PENDING_ACTION_EXPIRED: 'booking.pendingAction.errors.expired',
  BOOKING_PENDING_ACTION_ALREADY_RESOLVED: 'booking.pendingAction.errors.alreadyResolved',
  BOOKING_PENDING_ACTION_SUPERSEDED: 'booking.pendingAction.errors.superseded',
  BOOKING_PENDING_ACTION_NOT_RESOLVABLE: 'booking.pendingAction.errors.notResolvable',
  BOOKING_PENDING_ACTION_NOT_FOUND: 'booking.pendingAction.errors.notFound',
  BOOKING_NOT_FOUND: 'booking.pendingAction.errors.bookingNotFound',
} as const;

export function BookingPendingActionScreen(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const route = useRoute<PendingActionRoute>();
  const navigation = useNavigation<PendingActionNavigation>();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const pending = route.params;
  const resolveMutation = useResolvePendingAction();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const locale = toIntlLocale(i18n.resolvedLanguage);

  const selectedStop = useMemo(
    () => pending.candidateStops.find((stop) => candidateSelectionKey(stop) === selectedKey) ?? null,
    [pending.candidateStops, selectedKey],
  );

  const needsStopSelection = pending.reason === 'ROUTE_CHANGE';
  const canAccept = !needsStopSelection || selectedStop != null;
  const isBusy = resolveMutation.isPending;

  const title = pending.reason === 'ROUTE_CHANGE'
    ? t('booking.pendingAction.routeTitle')
    : t('booking.pendingAction.scheduleTitle');

  const refundCopy = pending.refundPercent == null
    ? t('booking.pendingAction.refundUnspecified')
    : t('booking.pendingAction.refundPercent', { percent: pending.refundPercent });

  const formattedDeadline = pending.deadline
    ? formatDateTime(pending.deadline, locale)
    : null;
  const formattedOldDeparture = pending.oldDeparture
    ? formatDateTime(pending.oldDeparture, locale)
    : null;
  const formattedNewDeparture = pending.newDeparture
    ? formatDateTime(pending.newDeparture, locale)
    : null;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const reportResult = useCallback((
    decision: 'ACCEPTED' | 'REJECTED',
  ) => {
    Alert.alert(
      decision === 'ACCEPTED'
        ? t('booking.pendingAction.acceptSuccessTitle')
        : t('booking.pendingAction.rejectSuccessTitle'),
      decision === 'ACCEPTED'
        ? t('booking.pendingAction.acceptSuccessBody')
        : t('booking.pendingAction.rejectSuccessBody'),
      [
        {
          text: t('common.ok'),
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            navigation.navigate('Main', {
              screen: 'BookingHistory',
              params: { initialTab: 'ticket' },
            });
          },
        },
      ],
    );
  }, [navigation, t]);

  const submit = useCallback(async (decision: 'ACCEPTED' | 'REJECTED') => {
    if (isBusy) return;

    try {
      const result = await resolveMutation.mutateAsync({
        bookingId: pending.bookingId,
        pendingActionId: pending.pendingActionId,
        action: decision,
        ...(decision === 'ACCEPTED' && selectedStop
          ? toResolveSelection(selectedStop)
          : {}),
      });
      reportResult(result.resolvedAction);
    } catch (error) {
      Alert.alert(
        t('booking.pendingAction.errorTitle'),
        getLocalizedApiErrorMessage(error, t, RESOLVE_ERROR_KEYS),
      );
    }
  }, [
    isBusy,
    pending.bookingId,
    pending.pendingActionId,
    reportResult,
    resolveMutation,
    selectedStop,
    t,
  ]);

  const handleAccept = useCallback(() => {
    if (!canAccept) {
      Alert.alert(
        t('app.name'),
        t('booking.pendingAction.selectStopRequired'),
      );
      return;
    }
    submit('ACCEPTED').catch(() => undefined);
  }, [canAccept, submit, t]);

  const handleReject = useCallback(() => {
    Alert.alert(
      t('booking.pendingAction.rejectConfirmTitle'),
      refundCopy,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('booking.pendingAction.rejectConfirmAction'),
          style: 'destructive',
          onPress: () => {
            submit('REJECTED').catch(() => undefined);
          },
        },
      ],
    );
  }, [refundCopy, submit, t]);

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
          style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={22} color={theme.colors.textPrimary} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          {pending.reason === 'ROUTE_CHANGE'
            ? t('booking.pendingAction.routeLead')
            : t('booking.pendingAction.scheduleLead')}
        </Text>

        {formattedOldDeparture && formattedNewDeparture ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t('booking.pendingAction.oldDeparture')}</Text>
            <Text style={styles.cardValue}>{formattedOldDeparture}</Text>
            <Text style={[styles.cardLabel, styles.cardLabelSpaced]}>
              {t('booking.pendingAction.newDeparture')}
            </Text>
            <Text style={styles.cardValue}>{formattedNewDeparture}</Text>
          </View>
        ) : null}

        {formattedDeadline ? (
          <View style={styles.deadlineRow}>
            <ClockCountdown size={18} color={theme.colors.warningForeground} weight="bold" />
            <Text style={styles.deadlineText}>
              {t('booking.pendingAction.deadline', { time: formattedDeadline })}
            </Text>
          </View>
        ) : null}

        {needsStopSelection ? (
          <View style={styles.section}>
            <View style={styles.sectionHeading}>
              <PathIcon size={18} color={theme.colors.primary} weight="bold" />
              <Text style={styles.sectionTitle}>
                {t('booking.pendingAction.chooseNewPickup')}
              </Text>
            </View>
            {pending.candidateStops.length === 0 ? (
              <View style={styles.warningCard}>
                <WarningCircle size={18} color={theme.colors.warningForeground} weight="fill" />
                <Text style={styles.warningText}>
                  {t('booking.pendingAction.missingCandidates')}
                </Text>
              </View>
            ) : (
              pending.candidateStops.map((stop) => (
                <StopChoice
                  key={candidateSelectionKey(stop)}
                  stop={stop}
                  selected={candidateSelectionKey(stop) === selectedKey}
                  locale={locale}
                  onPress={() => setSelectedKey(candidateSelectionKey(stop))}
                />
              ))
            )}
          </View>
        ) : null}

        <Text style={styles.refundNote}>{refundCopy}</Text>
      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.pendingAction.reject')}
          accessibilityState={{ disabled: isBusy }}
          disabled={isBusy}
          onPress={handleReject}
          style={({ pressed }) => [
            styles.secondaryButton,
            isBusy ? styles.disabled : null,
            pressed && !isBusy ? styles.pressed : null,
          ]}
        >
          <Text style={styles.secondaryLabel}>{t('booking.pendingAction.reject')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.pendingAction.accept')}
          accessibilityState={{ disabled: isBusy || !canAccept }}
          disabled={isBusy || !canAccept}
          onPress={handleAccept}
          style={({ pressed }) => [
            styles.primaryButton,
            isBusy || !canAccept ? styles.disabled : null,
            pressed && !isBusy && canAccept ? styles.pressed : null,
          ]}
        >
          {isBusy ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.primaryLabel}>{t('booking.pendingAction.accept')}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function StopChoice({
  stop,
  selected,
  locale,
  onPress,
}: {
  stop: BookingPendingActionStop;
  selected: boolean;
  locale: string;
  onPress: () => void;
}): React.JSX.Element {
  const arrival = stop.estimatedArrivalAt
    ? formatDateTime(stop.estimatedArrivalAt, locale)
    : undefined;

  return (
    <RadioOption
      label={stop.stationName}
      sublabel={arrival}
      selected={selected}
      onPress={onPress}
    />
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
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
  iconButton: {
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
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  lead: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: theme.effects.contentSurface,
    borderColor: theme.effects.contentBorder,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardLabel: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
  },
  cardLabelSpaced: {
    marginTop: spacing.md,
  },
  cardValue: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    marginTop: spacing.xs,
  },
  deadlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  deadlineText: {
    color: theme.colors.warningForeground,
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
  },
  warningCard: {
    alignItems: 'flex-start',
    backgroundColor: theme.colors.warningLight,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  warningText: {
    color: theme.colors.textPrimary,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  refundNote: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
  actions: {
    ...theme.components.actionBar,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: theme.colors.error,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  secondaryLabel: {
    color: theme.colors.error,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
  primaryButton: {
    ...theme.components.primaryButton,
    alignItems: 'center',
    borderRadius: borderRadius.full,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: spacing.md,
  },
  primaryLabel: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
