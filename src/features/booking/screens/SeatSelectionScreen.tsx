/** SeatSelectionScreen — Interactive seat map for choosing seats
 *
 * Visual style: matches Parcel flow (gradient bg, mint palette, card surfaces)
 */

import React, { useEffect, useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowClockwise, WarningCircle } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import { useTheme } from '@shared/contexts/ThemeContext';
import type { AppTheme } from '@shared/theme';
import { FloatingActionBar, RouteProgressRow, SeatLegend } from '../components';
import { useBookingStore } from '../store/useBookingStore';
import { SeatGrid } from '../components/SeatGrid';
import { useStationDetail } from '@features/trip/hooks';
import { buildSeatBadgeItems } from '../utils/seatPresentation';

interface SeatSelectionStepProps {
  onNext: (step: number) => void;
}

export function SeatSelectionScreen({
  onNext,
}: SeatSelectionStepProps): React.JSX.Element {
  const { t } = useTranslation();
  const selectedTrip = useBookingStore(state => state.selectedTrip);
  const seatMap = useBookingStore(state => state.seatMap);
  const seatMapAisles = useBookingStore(state => state.seatMapAisles);
  const seatMapStatus = useBookingStore(state => state.seatMapStatus);
  const tripDetailStatus = useBookingStore(state => state.tripDetailStatus);
  const selectedSeats = useBookingStore(state => state.selectedSeats);
  const toggleSeat = useBookingStore(state => state.toggleSeat);
  const initSeatMap = useBookingStore(state => state.initSeatMap);
  const initTripDetail = useBookingStore(state => state.initTripDetail);
  const getTotalPrice = useBookingStore(state => state.totalPrice);
  const currentLeg = useBookingStore(state => state.currentLeg);
  const isRoundTrip = useBookingStore(
    state => state.searchParams.isRoundTrip ?? false,
  );
  const setHighestStep = useBookingStore(state => state.setHighestStep);
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  // Warm the capability cache while seat/detail requests run in parallel.
  useStationDetail(selectedTrip?.originStationId, Boolean(selectedTrip?.originStationId));

  useEffect(() => {
    initSeatMap();
    initTripDetail();
    setHighestStep(currentLeg === 'outbound' ? 2 : 6);
  }, [initSeatMap, initTripDetail, setHighestStep, currentLeg]);

  const handleBookNow = useCallback(() => {
    // Outbound: step 2 -> step 3; Return: step 6 -> step 7
    const nextStep = currentLeg === 'outbound' ? 3 : 7;
    onNext(nextStep);
  }, [onNext, currentLeg]);
  const retrySeatMap = useCallback(() => {
    initSeatMap().catch(() => undefined);
  }, [initSeatMap]);
  const retryTripDetail = useCallback(() => {
    initTripDetail().catch(() => undefined);
  }, [initTripDetail]);

  const trip = selectedTrip;
  const seatBadges = useMemo(
    () => buildSeatBadgeItems(selectedSeats, {
      scope: isRoundTrip ? currentLeg : 'trip',
      tripId: selectedTrip?.id,
    }),
    [currentLeg, isRoundTrip, selectedSeats, selectedTrip?.id],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isRoundTrip
            ? currentLeg === 'outbound'
              ? t('booking.seats.selectOutbound')
              : t('booking.seats.selectReturn')
            : t('booking.seats.select')}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Route Info Card */}
        <RouteProgressRow
          departureCode={trip?.departureCity ?? ''}
          departureTime={trip?.departureTime ?? ''}
          arrivalCode={trip?.arrivalCity ?? ''}
          arrivalTime={trip?.arrivalTime ?? ''}
          durationHours={trip?.durationHours}
          style={styles.routeSummary}
        />

        {tripDetailStatus === 'error' ? (
          <View style={styles.warningPanel} accessibilityRole="alert">
            <WarningCircle size={20} color={theme.colors.warningForeground} weight="fill" />
            <View style={styles.warningCopy}>
              <Text style={styles.warningTitle}>{t('booking.seatMap.detailError')}</Text>
              <Text style={styles.warningBody}>{t('booking.seatMap.detailErrorDescription')}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.retry')}
              hitSlop={8}
              onPress={retryTripDetail}
              style={({ pressed }) => [styles.iconButton, pressed ? styles.pressed : null]}
            >
              <ArrowClockwise size={20} color={theme.colors.primary} weight="bold" />
            </Pressable>
          </View>
        ) : null}

        {/* Seat Legend */}
        <View style={styles.legendWrap}>
          <SeatLegend />
        </View>

        {/* Seat Grid */}
        <View style={styles.seatWrap}>
          {seatMapStatus === 'loading' && seatMap.length === 0 ? (
            <View style={styles.resourcePanel} accessibilityRole="progressbar">
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={styles.resourceTitle}>{t('booking.seatMap.loading')}</Text>
              <Text style={styles.resourceBody}>{t('booking.seatMap.loadingDescription')}</Text>
            </View>
          ) : seatMapStatus === 'error' && seatMap.length === 0 ? (
            <View style={styles.resourcePanel} accessibilityRole="alert">
              <WarningCircle size={28} color={theme.colors.warningForeground} weight="duotone" />
              <Text style={styles.resourceTitle}>{t('booking.seatMap.loadError')}</Text>
              <Text style={styles.resourceBody}>{t('booking.seatMap.loadErrorDescription')}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={retrySeatMap}
                style={({ pressed }) => [styles.retryButton, pressed ? styles.pressed : null]}
              >
                <ArrowClockwise size={17} color={theme.colors.textInverse} weight="bold" />
                <Text style={styles.retryText}>{t('common.retry')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {seatMapStatus === 'error' ? (
                <View style={styles.inlineRetry} accessibilityRole="alert">
                  <Text style={styles.inlineRetryText}>{t('booking.seatMap.refreshError')}</Text>
                  <Pressable accessibilityRole="button" onPress={retrySeatMap} hitSlop={8}>
                    <Text style={styles.inlineRetryAction}>{t('common.retry')}</Text>
                  </Pressable>
                </View>
              ) : null}
              <SeatGrid
                seatMap={seatMap}
                aisleAfterCols={seatMapAisles}
                selectedSeats={selectedSeats}
                onSeatPress={toggleSeat}
              />
            </>
          )}
        </View>
      </ScrollView>

      <FloatingActionBar
        seatBadges={seatBadges}
        totalPrice={getTotalPrice()}
        ctaLabel={t('common.continue')}
        onPress={handleBookNow}
        disabled={seatMapStatus !== 'success' || selectedSeats.length === 0}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    color: theme.colors.textPrimary,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  scroll: {
    flex: 1,
  },
  routeSummary: {
    marginBottom: spacing.md,
  },
  legendWrap: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  seatWrap: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  warningPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: theme.colors.warningLight,
    marginBottom: spacing.md,
  },
  warningCopy: { flex: 1 },
  warningTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  warningBody: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resourcePanel: {
    width: '100%',
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  resourceTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  resourceBody: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    marginTop: spacing.sm,
  },
  retryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  inlineRetry: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 14,
    backgroundColor: theme.colors.warningLight,
  },
  inlineRetryText: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  inlineRetryAction: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  pressed: { opacity: 0.72 },
});
