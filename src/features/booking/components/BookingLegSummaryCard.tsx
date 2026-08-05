import React, { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPinLine, PencilSimple, Van } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { BookingLegDraft } from '../utils/bookingPayload';
import { InfoRow } from './InfoRow';
import { SectionCard } from './SectionCard';

interface BookingLegSummaryCardProps {
  title: string;
  leg: BookingLegDraft;
  onEdit?: () => void;
}

interface ShuttleRequestSummaryProps {
  address: string;
  label: string;
  hint: string;
}

const ShuttleRequestSummary = memo(function ShuttleRequestSummaryComponent({
  address,
  label,
  hint,
}: ShuttleRequestSummaryProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.shuttleBlock}>
      <View style={[styles.locationIconBox, styles.shuttleIconBox]}>
        <Van size={18} weight="duotone" color={theme.accents.assistant.foreground} />
      </View>
      <View style={styles.locationCopy}>
        <Text style={styles.locationLabel}>{label}</Text>
        <Text style={styles.locationValue}>{address}</Text>
        <Text style={styles.locationHint}>{hint}</Text>
      </View>
    </View>
  );
});

export const BookingLegSummaryCard = memo(function BookingLegSummaryCardComponent({
  title,
  leg,
  onEdit,
}: BookingLegSummaryCardProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { trip, seats, pickUp, dropOff, shuttlePickup, shuttleDropoff } = leg;

  if (!trip) return null;

  return (
    <SectionCard>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardTitle}>{title}</Text>
        {onEdit ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('booking.checkout.editLeg', { leg: title })}
            hitSlop={8}
            style={({ pressed }) => [
              styles.editButton,
              pressed ? styles.editButtonPressed : null,
            ]}
            onPress={onEdit}
          >
            <PencilSimple
              size={14}
              weight="bold"
              color={theme.accents.ticket.foreground}
            />
          </Pressable>
        ) : null}
      </View>

      <InfoRow
        label={t('booking.checkout.route')}
        value={`${trip.departureCity || t('common.notAvailable')} → ${trip.arrivalCity || t('common.notAvailable')}`}
      />
      <InfoRow
        label={t('booking.checkout.departureTime')}
        value={trip.departureTime || t('common.notAvailable')}
      />
      <InfoRow
        label={t('booking.checkout.seats')}
        value={seats.map((seat) => seat.label || seat.id).join(', ') || t('common.none')}
        showDivider
      />

      {shuttlePickup ? (
        <ShuttleRequestSummary
          address={shuttlePickup.address}
          label={t('booking.checkout.shuttleRequest')}
          hint={t('booking.checkout.shuttleAwaiting')}
        />
      ) : null}

      <View style={styles.locationBlock}>
        <View style={styles.locationSurface}>
          <View style={styles.locationIconBox}>
            <MapPinLine size={18} weight="duotone" color={theme.accents.ticket.foreground} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>
              {t('booking.checkout.boardingAt', {
                time: pickUp?.time || t('common.notAvailable'),
              })}
            </Text>
            <Text style={styles.locationValue}>
              {pickUp?.name || t('booking.checkout.selectPickup')}
            </Text>
          </View>
        </View>
        {pickUp?.address ? <Text style={styles.address}>{pickUp.address}</Text> : null}
      </View>

      <View style={styles.locationBlockLarge}>
        <View style={styles.locationSurface}>
          <View style={styles.locationIconBox}>
            <MapPinLine size={18} weight="duotone" color={theme.accents.ticket.foreground} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationLabel}>
              {t('booking.checkout.alightingAt', {
                time: dropOff?.time || t('common.notAvailable'),
              })}
            </Text>
            <Text style={styles.locationValue}>
              {dropOff?.name || t('booking.checkout.selectDropoff')}
            </Text>
          </View>
        </View>
        {dropOff?.address ? <Text style={styles.address}>{dropOff.address}</Text> : null}
      </View>

      {shuttleDropoff ? (
        <ShuttleRequestSummary
          address={shuttleDropoff.address}
          label={t('booking.checkout.shuttleDropoffRequest')}
          hint={t('booking.checkout.shuttleAwaiting')}
        />
      ) : null}
    </SectionCard>
  );
});

const createStyles = (theme: AppTheme) => ({
  cardHeaderRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: theme.accents.ticket.soft,
    borderWidth: 1,
    borderColor: theme.accents.ticket.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  editButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  locationBlock: {
    marginTop: spacing.md,
  },
  locationBlockLarge: {
    marginTop: spacing.lg,
  },
  locationSurface: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.contentSurfaceSoft,
  },
  shuttleBlock: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.accents.assistant.soft,
    borderWidth: 1,
    borderColor: theme.accents.assistant.border,
  },
  locationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.accents.ticket.soft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  shuttleIconBox: {
    backgroundColor: theme.accents.assistant.soft,
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationLabel: {
    marginBottom: 2,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  locationValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    color: theme.colors.textPrimary,
  },
  locationHint: {
    marginTop: spacing.xxs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  address: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
});
