import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Clock,
  Info,
  MapPin,
  Truck,
} from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDateTime, formatVnd } from '@shared/utils/format';
import { isParcelQuoteUsable } from '../../utils/parcelQuote';
import {
  isDropoffPointAtDestination,
  type ParcelDeliveryOption,
} from '../../utils/parcelDeliveryOptions';

export interface ParcelDeliveryOptionCardProps {
  option: ParcelDeliveryOption;
  isSelected: boolean;
  onSelect: (option: ParcelDeliveryOption) => void;
}

function ParcelDeliveryOptionCardComponent({
  option,
  isSelected,
  onSelect,
}: ParcelDeliveryOptionCardProps): React.JSX.Element {
  const { trip, dropoffPoint } = option;
  const theme = useTheme();
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const quoteAvailable = isParcelQuoteUsable(trip);
  const isAtDestination = isDropoffPointAtDestination(trip, dropoffPoint);
  const pointBadgeText =
    dropoffPoint.type === 'STATION'
      ? t('parcel.delivery.dropoffStationBadge')
      : t('parcel.delivery.dropoffStopBadge');

  const formattedDeparture = formatDateTime(trip.departureDateTime) || trip.departureDateTime;
  const formattedArrival = formatDateTime(dropoffPoint.estimatedArrivalTime) || dropoffPoint.estimatedArrivalTime;
  const priceText = quoteAvailable
    ? formatVnd(trip.estimatedPriceVnd)
    : t('parcel.delivery.disabledQuote');

  const handlePress = useCallback(() => {
    if (quoteAvailable) {
      onSelect(option);
    }
  }, [onSelect, option, quoteAvailable]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{
        selected: isSelected,
        disabled: !quoteAvailable,
      }}
      accessibilityLabel={t('parcel.delivery.optionAccessibility', {
        pointName: dropoffPoint.name,
        pointType: pointBadgeText,
        departureTime: formattedDeparture,
        arrivalTime: formattedArrival,
        price: priceText,
      })}
      disabled={!quoteAvailable}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        isSelected ? styles.cardSelected : null,
        !quoteAvailable ? styles.cardDisabled : null,
        pressed && quoteAvailable ? styles.pressed : null,
      ]}
    >
      {/* Top Header: Point Name + Point Type Badge */}
      <View style={styles.headerRow}>
        <View style={styles.pointNameContainer}>
          <View style={[styles.badge, dropoffPoint.type === 'STOP' ? styles.stopBadge : null]}>
            <MapPin
              size={12}
              color={dropoffPoint.type === 'STOP' ? theme.colors.accent : theme.colors.primary}
              weight="fill"
            />
            <Text
              style={[
                styles.badgeText,
                dropoffPoint.type === 'STOP' ? styles.stopBadgeText : null,
              ]}
            >
              {pointBadgeText}
            </Text>
          </View>
          <Text style={styles.pointName} numberOfLines={2}>
            {dropoffPoint.name}
          </Text>
        </View>

        <View style={styles.radioContainer}>
          {isSelected ? (
            <CheckCircle size={24} color={theme.colors.primary} weight="fill" />
          ) : (
            <View style={styles.radioEmpty} />
          )}
        </View>
      </View>

      {/* Trip & Timing Meta */}
      <View style={styles.metaSection}>
        <View style={styles.metaRow}>
          <Truck size={16} color={theme.colors.textSecondary} weight="duotone" />
          <Text style={styles.operatorText} numberOfLines={1}>
            {trip.operatorName?.trim() || t('parcel.trips.operatorUnavailable')}
          </Text>
          <Text style={styles.routeContextText} numberOfLines={1}>
            · {trip.originStation.name} → {trip.destinationStation.name}
          </Text>
        </View>

        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>{t('parcel.route.from')}</Text>
            <Text style={styles.timeValue}>{formattedDeparture}</Text>
            <Text style={styles.stationSubtitle} numberOfLines={1}>
              {trip.originStation.name}
            </Text>
          </View>

          <View style={styles.timeDivider}>
            <Clock size={14} color={theme.colors.textTertiary} />
            <View style={styles.timeDottedLine} />
          </View>

          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>{t('parcel.route.to')}</Text>
            <Text style={styles.timeValue}>{formattedArrival}</Text>
            <Text style={styles.stationSubtitle} numberOfLines={1}>
              {dropoffPoint.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Intermediate Stop Notice */}
      {!isAtDestination ? (
        <View style={styles.noticeBox}>
          <Info size={14} color={theme.colors.info} weight="bold" />
          <Text style={styles.noticeText}>
            {t('parcel.delivery.continuesAfterDropoff', {
              destination: trip.destinationStation.name,
              point: dropoffPoint.name,
            })}
          </Text>
        </View>
      ) : null}

      {/* Pricing Footer */}
      <View style={styles.footerRow}>
        <View style={styles.priceContainer}>
          {quoteAvailable ? (
            <View style={styles.priceDetailsRow}>
              <Text style={styles.finalPriceText}>
                {formatVnd(trip.estimatedPriceVnd)}
              </Text>
              <Text style={styles.depositText}>
                {t('parcel.delivery.depositCost', {
                  deposit: formatVnd(trip.estimatedDepositVnd),
                })}
              </Text>
            </View>
          ) : (
            <Text style={styles.disabledQuoteText}>
              {t('parcel.trips.quoteUnavailable')}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

export const ParcelDeliveryOptionCard = memo(ParcelDeliveryOptionCardComponent);

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  cardSelected: {
    backgroundColor: theme.colors.primaryFaded,
    borderColor: theme.colors.primary,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  pointNameContainer: {
    flex: 1,
    gap: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primaryFaded,
  },
  stopBadge: {
    backgroundColor: theme.colors.accentLight ?? theme.colors.surfaceAlt,
  },
  badgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.primary,
    letterSpacing: 0.4,
  },
  stopBadgeText: {
    color: theme.colors.accent,
  },
  pointName: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    lineHeight: fontSizes.md * 1.3,
  },
  radioContainer: {
    paddingLeft: spacing.sm,
    paddingTop: 2,
  },
  radioEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  metaSection: {
    gap: spacing.xs,
    paddingTop: spacing.xs / 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  operatorText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
  },
  routeContextText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.xs / 2,
  },
  timeBlock: {
    flex: 1,
  },
  timeLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textTertiary,
    textTransform: 'uppercase' as const,
  },
  timeValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  stationSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  timeDivider: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  timeDottedLine: {
    width: 20,
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: 2,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.infoLight ?? theme.colors.surfaceAlt,
  },
  noticeText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs - 2,
    color: theme.colors.info ?? theme.colors.textSecondary,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    paddingTop: spacing.xs,
  },
  priceContainer: {
    flex: 1,
  },
  priceDetailsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  finalPriceText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  depositText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  disabledQuoteText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
  },
});
