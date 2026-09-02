import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowsClockwise,
  CalendarBlank,
  WarningCircle,
} from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { addApiCalendarDays } from '@shared/utils/apiTime';
import { formatShortDate } from '@shared/utils/format';
import { ParcelDeliveryOptionCard } from './ParcelDeliveryOptionCard';
import type { ParcelDeliveryOption } from '../../utils/parcelDeliveryOptions';

const DATE_OFFSETS = [0, 1, 2, 3, 4, 5, 6, 7];

const getDayOfWeekLabel = (dateStr: string): string => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return '';
    const date = new Date(Date.UTC(y, m - 1, d));
    const day = date.getUTCDay();
    const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return labels[day] ?? '';
  } catch {
    return '';
  }
};

export interface ParcelDeliveryOptionsStepProps {
  options: ParcelDeliveryOption[];
  selectedOptionKey: string | null;
  onSelectOption: (option: ParcelDeliveryOption) => void;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onTryNextDay: () => void;
  onChangeRoute: () => void;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  onContinue: () => void;
  departureOffset: number;
  onSelectDepartureOffset: (offset: number) => void;
  departureDateBase: string;
  departureDateText: string;
}

const DeliveryOptionSkeleton = memo(function DeliveryOptionSkeleton(): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonBadge} />
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonMeta} />
      <View style={styles.skeletonRow} />
    </View>
  );
});

function ParcelDeliveryOptionsStepComponent({
  options,
  selectedOptionKey,
  onSelectOption,
  isLoading,
  isError,
  onRetry,
  onTryNextDay,
  onChangeRoute,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  onContinue,
  departureOffset,
  onSelectDepartureOffset,
  departureDateBase,
  departureDateText,
}: ParcelDeliveryOptionsStepProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();

  const canContinue = Boolean(selectedOptionKey);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ParcelDeliveryOption>) => (
      <ParcelDeliveryOptionCard
        option={item}
        isSelected={selectedOptionKey === item.key}
        onSelect={onSelectOption}
      />
    ),
    [onSelectOption, selectedOptionKey],
  );

  const keyExtractor = useCallback(
    (item: ParcelDeliveryOption) => item.key,
    [],
  );

  const renderFooter = useCallback(() => {
    if (isFetchingNextPage) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.footerLoadingText}>
            {t('parcel.delivery.loadingMore')}
          </Text>
        </View>
      );
    }
    if (hasNextPage) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parcel.delivery.loadMore')}
          onPress={onLoadMore}
          style={({ pressed }) => [
            styles.loadMoreButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.loadMoreButtonText}>
            {t('parcel.delivery.loadMore')}
          </Text>
        </Pressable>
      );
    }
    return null;
  }, [hasNextPage, isFetchingNextPage, onLoadMore, styles, t, theme.colors.primary]);

  return (
    <View style={styles.container}>
      {/* Interactive Departure Date Selector Bar */}
      <View style={styles.dateSelectorSection}>
        <View style={styles.dateHeaderRow}>
          <CalendarBlank size={16} color={theme.colors.primary} weight="bold" />
          <Text style={styles.dateHeaderTitle}>
            {t('parcel.trips.departureDate')}: <Text style={styles.dateHeaderDateText}>{departureDateText}</Text>
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChipsRow}
        >
          {DATE_OFFSETS.map(offset => {
            const dateStr = addApiCalendarDays(departureDateBase, offset);
            const isSelected = departureOffset === offset;
            const dayLabel =
              offset === 0
                ? t('home.booking.today')
                : offset === 1
                  ? t('home.booking.tomorrow')
                  : getDayOfWeekLabel(dateStr);

            return (
              <Pressable
                key={offset}
                accessibilityRole="button"
                accessibilityLabel={`${dayLabel}, ${formatShortDate(dateStr)}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => onSelectDepartureOffset(offset)}
                style={({ pressed }) => [
                  styles.dateChip,
                  isSelected ? styles.dateChipSelected : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.dateChipDay,
                    isSelected ? styles.dateChipDaySelected : null,
                  ]}
                >
                  {dayLabel}
                </Text>
                <Text
                  style={[
                    styles.dateChipDate,
                    isSelected ? styles.dateChipDateSelected : null,
                  ]}
                >
                  {formatShortDate(dateStr)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content: List, Loading, Error, or Empty */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <DeliveryOptionSkeleton />
          <DeliveryOptionSkeleton />
          <DeliveryOptionSkeleton />
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <WarningCircle size={40} color={theme.colors.error} weight="duotone" />
          <Text style={styles.errorTitle}>
            {t('parcel.trips.loadError')}
          </Text>
          <Text style={styles.errorDescription}>
            {t('parcel.trips.loadErrorDescription')}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('parcel.actions.refresh')}
            onPress={onRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <ArrowsClockwise size={16} color={theme.colors.textInverse} weight="bold" />
            <Text style={styles.retryButtonText}>{t('parcel.actions.refresh')}</Text>
          </Pressable>
        </View>
      ) : options.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <CalendarBlank size={36} color={theme.colors.primary} weight="duotone" />
          </View>
          <Text style={styles.emptyTitle}>
            {t('parcel.delivery.emptyTitle')}
          </Text>
          <Text style={styles.emptyDescription}>
            {t('parcel.delivery.emptyDescription', {
              date: departureDateText,
            })}
          </Text>

          <View style={styles.emptyActionsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('parcel.actions.tryNextDay')}
              onPress={onTryNextDay}
              style={({ pressed }) => [
                styles.emptyActionButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.emptyActionButtonText}>
                {t('parcel.actions.tryNextDay')}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('parcel.actions.changeRoute')}
              onPress={onChangeRoute}
              style={({ pressed }) => [
                styles.emptyActionSecondary,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text style={styles.emptyActionSecondaryText}>
                {t('parcel.actions.changeRoute')}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.listContainer}>
          <FlashList
            style={styles.list}
            data={options}
            extraData={selectedOptionKey}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={[
              styles.listContent,
              isCompact ? styles.listContentCompact : null,
            ]}
            ListFooterComponent={renderFooter}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          testID="parcel-delivery-continue"
          accessibilityRole="button"
          accessibilityLabel={t('parcel.actions.continueToConfirm')}
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
          style={({ pressed }) => [
            styles.continueButton,
            !canContinue ? styles.continueButtonDisabled : null,
            pressed && canContinue ? styles.pressed : null,
          ]}
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>
            {t('parcel.actions.continueToConfirm')}
          </Text>
          <ArrowRight size={18} color={theme.colors.textInverse} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

export const ParcelDeliveryOptionsStep = memo(ParcelDeliveryOptionsStepComponent);

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    minHeight: 0,
  },
  dateSelectorSection: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    backgroundColor: 'transparent',
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: 2,
  },
  dateHeaderTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  dateHeaderDateText: {
    color: theme.colors.primaryDark,
  },
  dateChipsRow: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 72,
  },
  dateChipSelected: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
  },
  dateChipDay: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  dateChipDaySelected: {
    fontFamily: fontFamilies.bold,
    color: theme.colors.primaryDark,
  },
  dateChipDate: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  dateChipDateSelected: {
    color: theme.colors.primary,
  },
  listContainer: {
    flex: 1,
    minHeight: 0,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  listContentCompact: {
    paddingHorizontal: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    padding: spacing.xl,
    gap: spacing.md,
  },
  skeletonCard: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  skeletonBadge: {
    width: 80,
    height: 18,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonTitle: {
    width: '70%',
    height: 20,
    borderRadius: borderRadius.xs,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonMeta: {
    width: '50%',
    height: 14,
    borderRadius: borderRadius.xs,
    backgroundColor: theme.colors.skeleton,
  },
  skeletonRow: {
    width: '100%',
    height: 48,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.skeleton,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  errorDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  emptyDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: fontSizes.xs * 1.4,
  },
  emptyActionsRow: {
    width: '100%',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  emptyActionButton: {
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  emptyActionSecondary: {
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionSecondaryText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  footerLoadingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  loadMoreButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  bottomBar: {
    flexShrink: 0,
    zIndex: 1,
    elevation: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  continueButtonDisabled: {
    backgroundColor: theme.colors.textDisabled,
  },
  continueButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
