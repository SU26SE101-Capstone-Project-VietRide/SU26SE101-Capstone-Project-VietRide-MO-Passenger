import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowsClockwise,
  CalendarBlank,
  CheckCircle,
  Compass,
  MapPin,
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
import type { Station } from '../../types';
import { canAdvanceFromStep1 } from '../../utils/parcelCreateFlow';

export interface ParcelRouteDateStepProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station) => void;
  departureOffset: number;
  onSelectDepartureOffset: (offset: number) => void;
  departureDateBase: string;
  isLoadingStations: boolean;
  isStationsError: boolean;
  onRetryStations: () => void;
  nearbySortRequested: boolean;
  nearbySortResolved: boolean;
  nearbySortUnavailable: boolean;
  isResolvingLocation: boolean;
  onSortNearby: () => void;
  onContinue: () => void;
}

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

function ParcelRouteDateStepComponent({
  stations,
  selectedStation,
  onSelectStation,
  departureOffset,
  onSelectDepartureOffset,
  departureDateBase,
  isLoadingStations,
  isStationsError,
  onRetryStations,
  nearbySortRequested: _nearbySortRequested,
  nearbySortResolved,
  nearbySortUnavailable,
  isResolvingLocation,
  onSortNearby,
  onContinue,
}: ParcelRouteDateStepProps): React.JSX.Element {
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { isCompact } = useResponsiveLayout();

  const selectedDepartureDate = useMemo(
    () => addApiCalendarDays(departureDateBase, departureOffset),
    [departureDateBase, departureOffset],
  );

  const canAdvance = canAdvanceFromStep1({
    fromLocationCode: 'SELECTED',
    toLocationCode: 'SELECTED',
    originStation: selectedStation,
    departureDate: selectedDepartureDate,
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isCompact ? styles.scrollContentCompact : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Departure Date Selector */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <CalendarBlank size={18} color={theme.colors.primary} weight="bold" />
              <Text style={styles.sectionTitle}>
                {t('parcel.trips.departureDate')}
              </Text>
            </View>
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

        {/* Origin Stations Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <MapPin size={18} color={theme.colors.primary} weight="fill" />
              <Text style={styles.sectionTitle}>
                {t('parcel.route.originTerminal')}
              </Text>
            </View>

            {/* GPS Nearby Sort Action */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('parcel.stations.sortNearby')}
              onPress={onSortNearby}
              disabled={isResolvingLocation || isLoadingStations}
              style={({ pressed }) => [
                styles.sortNearbyButton,
                nearbySortResolved ? styles.sortNearbyButtonActive : null,
                pressed ? styles.pressed : null,
              ]}
            >
              {isResolvingLocation ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <Compass
                  size={14}
                  color={nearbySortResolved ? theme.colors.primaryDark : theme.colors.primary}
                  weight={nearbySortResolved ? 'fill' : 'bold'}
                />
              )}
              <Text
                style={[
                  styles.sortNearbyText,
                  nearbySortResolved ? styles.sortNearbyTextActive : null,
                ]}
              >
                {nearbySortResolved
                  ? t('parcel.stations.sortedNearby')
                  : t('parcel.stations.sortNearby')}
              </Text>
            </Pressable>
          </View>

          {nearbySortUnavailable ? (
            <Text style={styles.locationNoticeText}>
              {t('parcel.stations.locationUnavailable')}
            </Text>
          ) : null}

          {/* Station Cards List */}
          {isLoadingStations ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>
                {t('parcel.stations.finding')}
              </Text>
            </View>
          ) : isStationsError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {t('parcel.stations.loadError')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('common.retry')}
                onPress={onRetryStations}
                style={({ pressed }) => [
                  styles.retryButton,
                  pressed ? styles.pressed : null,
                ]}
              >
                <ArrowsClockwise size={14} color={theme.colors.textInverse} />
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : stations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>
                {t('parcel.stations.emptyTitle')}
              </Text>
              <Text style={styles.emptyDescription}>
                {t('parcel.stations.emptyDescription')}
              </Text>
            </View>
          ) : (
            <View style={styles.stationsList}>
              {stations.map(station => {
                const isSelected = selectedStation?.id === station.id;
                const distNum =
                  station.distance != null ? Number(station.distance) : null;
                const distanceText =
                  distNum != null && !Number.isNaN(distNum)
                    ? distNum < 1000
                      ? t('parcel.stations.distanceMeters', {
                          distance: Math.round(distNum),
                        })
                      : t('parcel.stations.distanceKilometers', {
                          distance: (distNum / 1000).toFixed(1),
                        })
                    : null;

                return (
                  <Pressable
                    key={station.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={t('parcel.stations.cardAccessibility', {
                      role: t('parcel.stations.originAccessibility'),
                      name: station.name,
                      distance: distanceText ?? '',
                    })}
                    onPress={() => onSelectStation(station)}
                    style={({ pressed }) => [
                      styles.stationCard,
                      isSelected ? styles.stationCardSelected : null,
                      pressed ? styles.pressed : null,
                    ]}
                  >
                    <View style={styles.stationCardBody}>
                      <Text style={styles.stationName} numberOfLines={2}>
                        {station.name}
                      </Text>
                      {station.address ? (
                        <Text style={styles.stationAddress} numberOfLines={1}>
                          {station.address}
                        </Text>
                      ) : null}
                      {distanceText ? (
                        <View style={styles.distanceBadge}>
                          <MapPin size={11} color={theme.colors.primary} weight="fill" />
                          <Text style={styles.distanceText}>{distanceText}</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.radioIndicator}>
                      {isSelected ? (
                        <CheckCircle
                          size={22}
                          color={theme.colors.primary}
                          weight="fill"
                        />
                      ) : (
                        <View style={styles.radioEmpty} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('parcel.actions.continueToFit')}
          accessibilityState={{ disabled: !canAdvance }}
          disabled={!canAdvance}
          style={({ pressed }) => [
            styles.continueButton,
            !canAdvance ? styles.continueButtonDisabled : null,
            pressed && canAdvance ? styles.pressed : null,
          ]}
          onPress={onContinue}
        >
          <Text style={styles.continueButtonText}>
            {t('parcel.actions.continueToFit')}
          </Text>
          <ArrowRight size={18} color={theme.colors.textInverse} weight="bold" />
        </Pressable>
      </View>
    </View>
  );
}

export const ParcelRouteDateStep = memo(ParcelRouteDateStepComponent);

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 100,
    gap: spacing.lg,
  },
  scrollContentCompact: {
    paddingHorizontal: spacing.md,
  },
  sectionContainer: {
    gap: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  dateChipsRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dateChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 84,
  },
  dateChipSelected: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
  },
  dateChipDay: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs - 1,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  dateChipDaySelected: {
    fontFamily: fontFamilies.bold,
    color: theme.colors.primaryDark,
  },
  dateChipDate: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  dateChipDateSelected: {
    color: theme.colors.primary,
  },
  sortNearbyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  sortNearbyButtonActive: {
    backgroundColor: theme.colors.primaryFaded,
  },
  sortNearbyText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.primary,
  },
  sortNearbyTextActive: {
    color: theme.colors.primaryDark,
  },
  locationNoticeText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textSecondary,
    marginTop: -2,
  },
  stationsList: {
    gap: spacing.sm,
  },
  stationCard: {
    ...theme.components.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  stationCardSelected: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
  },
  stationCardBody: {
    flex: 1,
    gap: 2,
    paddingRight: spacing.sm,
  },
  stationName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  stationAddress: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs - 1,
    color: theme.colors.textSecondary,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  distanceText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.primary,
  },
  radioIndicator: {
    paddingLeft: spacing.xs,
  },
  radioEmpty: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: 4,
  },
  emptyTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  emptyDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
