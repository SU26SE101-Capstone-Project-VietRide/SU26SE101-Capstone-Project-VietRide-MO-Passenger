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
  onEditTrip?: () => void;
  onEditSeats?: () => void;
  onEditPickup?: () => void;
  onEditDropoff?: () => void;
  onViewPolicies?: () => void;
}

interface ShuttleRequestSummaryProps {
  address: string;
  label: string;
  hint: string;
}

interface EditableSectionHeaderProps {
  label: string;
  onEdit?: () => void;
}

const distinctAddress = (
  name: string | undefined,
  address: string | undefined,
): string | null => {
  const normalizedAddress = address?.trim();
  if (!normalizedAddress) return null;

  const normalizedName = name?.trim();
  return normalizedName?.localeCompare(normalizedAddress, undefined, {
    sensitivity: 'accent',
  }) === 0
    ? null
    : normalizedAddress;
};

const EditableSectionHeader = memo(function EditableSectionHeaderComponent({
  label,
  onEdit,
}: EditableSectionHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('booking.checkout.editField', { field: label })}
          hitSlop={8}
          onPress={onEdit}
          style={({ pressed }) => [
            styles.editButton,
            pressed ? styles.editButtonPressed : null,
          ]}
        >
          <PencilSimple
            size={15}
            weight="bold"
            color={theme.accents.ticket.foreground}
          />
        </Pressable>
      ) : null}
    </View>
  );
});

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
        <Van
          size={18}
          weight="duotone"
          color={theme.colors.primary}
        />
      </View>
      <View style={styles.locationCopy}>
        <Text style={styles.locationLabel}>{label}</Text>
        <Text style={styles.locationValue}>{address}</Text>
        <Text style={styles.locationHint}>{hint}</Text>
      </View>
    </View>
  );
});

export const BookingLegSummaryCard = memo(
  function BookingLegSummaryCardComponent({
    title,
    leg,
    onEditTrip,
    onEditSeats,
    onEditPickup,
    onEditDropoff,
    onViewPolicies,
  }: BookingLegSummaryCardProps): React.JSX.Element | null {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const { trip, seats, pickUp, dropOff, shuttlePickup, shuttleDropoff } = leg;
    const pickupAddress = distinctAddress(pickUp?.name, pickUp?.address);
    const dropoffAddress = distinctAddress(dropOff?.name, dropOff?.address);

    if (!trip) return null;

    return (
      <SectionCard>
        <Text style={styles.cardTitle}>{title}</Text>

        <View style={[styles.stepSection, styles.firstStepSection]}>
          <EditableSectionHeader
            label={t('booking.steps.trip')}
            onEdit={onEditTrip}
          />
          <InfoRow
            label={t('booking.checkout.route')}
            value={`${trip.departureCity || t('common.notAvailable')} → ${
              trip.arrivalCity || t('common.notAvailable')
            }`}
          />
          <InfoRow
            label={t('booking.checkout.departureTime')}
            value={trip.departureTime || t('common.notAvailable')}
            style={onViewPolicies ? undefined : styles.lastInfoRow}
          />
          {onViewPolicies ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('booking.checkout.viewPoliciesAccessibility', {
                operator: trip.operatorBadge || t('policy.sections.operatorFallback'),
              })}
              onPress={onViewPolicies}
              style={({ pressed }) => [
                styles.policyLink,
                pressed ? styles.policyLinkPressed : null,
              ]}
            >
              <Text style={styles.policyLinkText}>
                {t('booking.checkout.viewPolicies')}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.stepSection}>
          <EditableSectionHeader
            label={t('booking.checkout.seats')}
            onEdit={onEditSeats}
          />
          <Text style={styles.sectionValue}>
            {seats.map(seat => seat.label || seat.id).join(', ') ||
              t('common.none')}
          </Text>
        </View>

        <View style={styles.stepSection}>
          <EditableSectionHeader
            label={t('booking.steps.pickup')}
            onEdit={onEditPickup}
          />
          {shuttlePickup ? (
            <ShuttleRequestSummary
              address={shuttlePickup.address}
              label={t('booking.checkout.shuttleRequest')}
              hint={t('booking.checkout.shuttleAwaiting')}
            />
          ) : null}
          <View
            style={shuttlePickup ? styles.locationBlockAfterShuttle : undefined}
          >
            <View style={styles.locationSurface}>
              <View style={styles.locationIconBox}>
                <MapPinLine
                  size={18}
                  weight="duotone"
                  color={theme.accents.ticket.foreground}
                />
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
                {pickupAddress ? (
                  <Text style={styles.address}>{pickupAddress}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.stepSection, styles.lastStepSection]}>
          <EditableSectionHeader
            label={t('booking.steps.dropoff')}
            onEdit={onEditDropoff}
          />
          <View>
            <View style={styles.locationSurface}>
              <View style={styles.locationIconBox}>
                <MapPinLine
                  size={18}
                  weight="duotone"
                  color={theme.accents.ticket.foreground}
                />
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
                {dropoffAddress ? (
                  <Text style={styles.address}>{dropoffAddress}</Text>
                ) : null}
              </View>
            </View>
          </View>
          {shuttleDropoff ? (
            <View style={styles.locationBlockAfterShuttle}>
              <ShuttleRequestSummary
                address={shuttleDropoff.address}
                label={t('booking.checkout.shuttleDropoffRequest')}
                hint={t('booking.checkout.shuttleAwaiting')}
              />
            </View>
          ) : null}
        </View>
      </SectionCard>
    );
  },
);

const createStyles = (theme: AppTheme) => ({
  cardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    marginBottom: spacing.lg,
  },
  stepSection: {
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.effects.contentBorder,
  },
  firstStepSection: {
    paddingTop: 0,
    borderTopWidth: 0,
  },
  lastStepSection: {
    paddingBottom: 0,
  },
  sectionHeaderRow: {
    minHeight: 36,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  sectionValue: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    color: theme.colors.textPrimary,
  },
  lastInfoRow: {
    marginBottom: 0,
  },
  policyLink: {
    alignSelf: 'flex-start' as const,
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center' as const,
  },
  policyLinkPressed: {
    opacity: 0.8,
  },
  policyLinkText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.accents.ticket.foreground,
  },
  editButton: {
    width: 36,
    height: 36,
    flexShrink: 0,
    borderRadius: borderRadius.full,
    borderCurve: 'continuous' as const,
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
  locationBlockAfterShuttle: {
    marginTop: spacing.md,
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
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.primaryFaded,
    borderWidth: 1,
    borderColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primaryFaded,
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
    marginTop: spacing.xxs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
});
