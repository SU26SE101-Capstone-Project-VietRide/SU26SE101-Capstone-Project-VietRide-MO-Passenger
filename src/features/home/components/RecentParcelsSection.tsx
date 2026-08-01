import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ArrowRight, Package, Truck } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useReceivedParcels } from '@features/parcel/hooks/useParcelQueries';
import type { ReceivedParcel } from '@features/parcel/types';
import { getParcelStatusPresentation } from '@features/parcel/utils/parcelPresentation';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDate, toIntlLocale } from '@shared/utils/format';

type StatusTone = 'active' | 'danger' | 'neutral' | 'success' | 'warning';

const ACTIVE_STATUSES = new Set([
  'RESERVED',
  'CHECKED_IN',
  'READY_TO_LOAD',
  'LOADED',
  'IN_TRANSIT',
  'PENDING_TRANSFER_CONFIRM',
]);
const DANGER_STATUSES = new Set([
  'CANCELLED',
  'DELIVERY_REJECTED',
  'EXPIRED',
  'REJECTED',
  'RETURNED',
]);
const SUCCESS_STATUSES = new Set(['DELIVERED_PENDING_CONFIRM', 'DELIVERY_CONFIRMED']);
const WARNING_STATUSES = new Set([
  'PENDING',
  'PENDING_ADDITIONAL_PAYMENT',
  'PENDING_FINAL_PAYMENT',
  'PENDING_OPERATOR_ACTION',
  'PENDING_OPERATOR_REVIEW',
  'PENDING_PAYMENT',
]);

const parcelKeyExtractor = (item: ReceivedParcel): string => item.parcelId;

const normalizePageSize = (pageSize: number): number => {
  if (!Number.isFinite(pageSize)) return 5;
  return Math.min(10, Math.max(1, Math.floor(pageSize)));
};

const resolveStatusTone = (status: string): StatusTone => {
  const normalizedStatus = status.trim().toUpperCase();
  if (SUCCESS_STATUSES.has(normalizedStatus)) return 'success';
  if (DANGER_STATUSES.has(normalizedStatus)) return 'danger';
  if (ACTIVE_STATUSES.has(normalizedStatus)) return 'active';
  if (WARNING_STATUSES.has(normalizedStatus)) return 'warning';
  return 'neutral';
};

interface RecentParcelCardProps {
  createdAt: string;
  destinationName: string;
  eta: string | null;
  onPress?: (parcelId: string, tripId: string) => void;
  originName: string;
  parcelCode: string;
  parcelId: string;
  status: string;
  tripId: string;
}

const RecentParcelCard = memo(function RecentParcelCardItem({
  createdAt,
  destinationName,
  eta,
  onPress,
  originName,
  parcelCode,
  parcelId,
  status,
  tripId,
}: RecentParcelCardProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const intlLocale = toIntlLocale(i18n.resolvedLanguage);
  const handlePress = useCallback(() => {
    onPress?.(parcelId, tripId);
  }, [onPress, parcelId, tripId]);
  const tone = resolveStatusTone(status);
  const createdLabel = useMemo(
    () => formatDate(createdAt, intlLocale) || createdAt,
    [createdAt, intlLocale],
  );
  const etaLabel = useMemo(
    () => eta ? (formatDate(eta, intlLocale) || eta) : t('home.parcels.pending'),
    [eta, intlLocale, t],
  );
  const statusPresentation = getParcelStatusPresentation(status);
  const statusLabel = t(statusPresentation.labelKey);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={t('home.parcels.cardAccessibility', {
        code: parcelCode,
        status: statusLabel,
      })}
      disabled={!onPress}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Package size={22} color={theme.colors.primary} weight="duotone" />
        </View>
        <View style={[
          styles.statusBadge,
          tone === 'active' ? styles.statusActive : null,
          tone === 'danger' ? styles.statusDanger : null,
          tone === 'success' ? styles.statusSuccess : null,
          tone === 'warning' ? styles.statusWarning : null,
        ]}>
          <Text style={styles.statusText} numberOfLines={1}>
            {statusLabel}
          </Text>
        </View>
      </View>

      <Text style={styles.parcelCode}>#{parcelCode}</Text>
      <View style={styles.routeRow}>
        <Truck size={17} color={theme.colors.textSecondary} weight="duotone" />
        <Text style={styles.routeText} numberOfLines={2}>
          {originName} → {destinationName}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>
          {t('home.parcels.created', { date: createdLabel })}
        </Text>
        <Text style={styles.metaLabel}>
          {t('home.parcels.eta', { date: etaLabel })}
        </Text>
      </View>
    </Pressable>
  );
});

export interface RecentParcelsSectionProps {
  onParcelPress?: (parcelId: string, tripId: string) => void;
  onViewAll?: () => void;
  pageSize?: number;
  title?: string;
}

export const RecentParcelsSection = memo(function RecentParcelsSectionComponent({
  onParcelPress,
  onViewAll,
  pageSize = 5,
  title,
}: RecentParcelsSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isGuest = useAuthStore((state) => state.isGuest);
  const safePageSize = normalizePageSize(pageSize);
  const parcelsQuery = useReceivedParcels(1, safePageSize);
  const refetchParcels = parcelsQuery.refetch;
  const parcels = useMemo(
    () => parcelsQuery.data?.items ?? [],
    [parcelsQuery.data?.items],
  );

  const handleRetry = useCallback(() => {
    refetchParcels().catch(() => undefined);
  }, [refetchParcels]);

  const renderParcel: ListRenderItem<ReceivedParcel> = useCallback(({ item }) => (
    <RecentParcelCard
      createdAt={item.createdAt}
      destinationName={item.destinationStation?.name ?? t('home.parcels.destinationPending')}
      eta={item.eta}
      onPress={onParcelPress}
      originName={item.originStation?.name ?? t('home.parcels.originPending')}
      parcelCode={item.parcelCode}
      parcelId={item.parcelId}
      status={item.status}
      tripId={item.tripId}
    />
  ), [onParcelPress, t]);

  let content: React.ReactNode;
  if (isGuest) {
    content = (
      <View
        style={styles.stateBox}
        accessibilityLabel={t('home.parcels.signInAccessibility')}
      >
        <Text style={styles.stateTitle}>{t('home.parcels.signInTitle')}</Text>
        <Text style={styles.stateText}>
          {t('home.parcels.signInDescription')}
        </Text>
      </View>
    );
  } else if (parcelsQuery.isLoading) {
    content = (
      <View
        style={styles.stateBox}
        accessibilityLabel={t('home.parcels.loadingAccessibility')}
      >
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.stateText}>{t('home.parcels.loading')}</Text>
      </View>
    );
  } else if (parcelsQuery.isError) {
    content = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{t('home.parcels.unavailableTitle')}</Text>
        <Text style={styles.stateText}>{t('home.parcels.unavailableDescription')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.parcels.retryAccessibility')}
          onPress={handleRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  } else if (parcels.length === 0) {
    content = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{t('home.parcels.emptyTitle')}</Text>
        <Text style={styles.stateText}>{t('home.parcels.emptyDescription')}</Text>
      </View>
    );
  } else {
    content = (
      <FlashList
        data={parcels}
        horizontal
        keyExtractor={parcelKeyExtractor}
        renderItem={renderParcel}
        showsHorizontalScrollIndicator={false}
        style={styles.list}
      />
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title ?? t('home.parcels.title')}</Text>
        {onViewAll && !isGuest ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('home.parcels.viewAllAccessibility')}
            onPress={onViewAll}
            style={styles.viewAllButton}
          >
            <Text style={styles.viewAllText}>{t('home.parcels.viewAll')}</Text>
            <ArrowRight size={15} color={theme.colors.primary} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      {content}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  section: {
    width: '100%' as const,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
  },
  viewAllButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xxs,
    paddingVertical: spacing.xs,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
  },
  list: {
    height: 188,
  },
  card: {
    ...theme.components.card,
    width: 276,
    minHeight: 176,
    marginRight: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  statusBadge: {
    maxWidth: 168,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.surfaceAlt,
  },
  statusActive: {
    backgroundColor: theme.colors.primaryFaded,
  },
  statusDanger: {
    backgroundColor: theme.colors.errorLight,
  },
  statusSuccess: {
    backgroundColor: theme.colors.successLight,
  },
  statusWarning: {
    backgroundColor: theme.colors.warningLight,
  },
  statusText: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
  },
  parcelCode: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
  routeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  routeText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  metaLabel: {
    flexShrink: 1,
    color: theme.colors.textTertiary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
  },
  stateBox: {
    minHeight: 112,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
  },
  stateTitle: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
  },
  stateText: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    textAlign: 'center' as const,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  retryText: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
