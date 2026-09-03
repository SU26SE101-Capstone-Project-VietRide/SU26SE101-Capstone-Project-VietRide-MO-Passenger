import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowRight, Bus, CalendarBlank, MapPin } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useBookingHistory } from '@features/booking/hooks/useBookingHistory';
import type { PassengerTicketHistoryItem } from '@features/profile/types';
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

type JourneyKind = 'active' | 'upcoming';

interface ActionableJourney {
  item: PassengerTicketHistoryItem;
  kind: JourneyKind;
  departureMs: number;
}

const toMillis = (value: string | null): number | null => {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const selectActionableJourney = (
  items: readonly PassengerTicketHistoryItem[],
  nowMs: number,
): ActionableJourney | null => {
  let active: ActionableJourney | null = null;
  let upcoming: ActionableJourney | null = null;

  for (const item of items) {
    if (item.status !== 'CONFIRMED') continue;
    const departureMs = toMillis(item.departureDateTime);
    if (departureMs === null) continue;
    const arrivalMs = toMillis(item.estimatedArrivalTime);

    if (
      departureMs <= nowMs
      && arrivalMs !== null
      && arrivalMs > nowMs
    ) {
      if (!active || departureMs > active.departureMs) {
        active = { item, kind: 'active', departureMs };
      }
      continue;
    }

    if (departureMs > nowMs && (!upcoming || departureMs < upcoming.departureMs)) {
      upcoming = { item, kind: 'upcoming', departureMs };
    }
  }

  return active ?? upcoming;
};

interface UpcomingJourneyCardProps {
  enabled: boolean;
  onOpen: (item: PassengerTicketHistoryItem) => void;
}

export const UpcomingJourneyCard = memo(function UpcomingJourneyCard({
  enabled,
  onOpen,
}: UpcomingJourneyCardProps): React.JSX.Element | null {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const query = useBookingHistory({ pageSize: 20 }, enabled);
  const intlLocale = toIntlLocale(i18n.resolvedLanguage ?? i18n.language);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Keep active/upcoming classification accurate while Home stays open. The
  // minute tick runs only while this screen is focused, so it does not create
  // background render work.
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return undefined;
      setNowMs(Date.now());
      const timer = setInterval(() => setNowMs(Date.now()), 60_000);
      return () => clearInterval(timer);
    }, [enabled]),
  );

  const journey = useMemo(() => {
    const items = query.data?.pages.flatMap(page => page.items) ?? [];
    return selectActionableJourney(items, nowMs);
  }, [nowMs, query.data?.pages]);

  const handleOpen = useCallback(() => {
    if (journey) onOpen(journey.item);
  }, [journey, onOpen]);

  if (!enabled || query.isLoading || !journey) return null;

  const { item, kind } = journey;
  const origin = item.originName ?? t('home.upcoming.unknownOrigin');
  const destination = item.destinationName ?? t('home.upcoming.unknownDestination');
  const departureLabel = item.departureDateTime
    ? formatDateTime(item.departureDateTime, intlLocale)
    : '';

  return (
    <View style={styles.section}>
      <View style={styles.eyebrowRow}>
        <View style={styles.accentLine} />
        <Text style={styles.eyebrow}>
          {kind === 'active'
            ? t('home.upcoming.activeEyebrow')
            : t('home.upcoming.upcomingEyebrow')}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.upcoming.openAccessibility', {
          origin,
          destination,
        })}
        onPress={handleOpen}
        style={({ pressed }) => [
          styles.card,
          pressed ? styles.cardPressed : null,
        ]}
      >
        <View style={styles.iconBox}>
          <Bus size={24} color={theme.accents.ticket.foreground} weight="duotone" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {origin} → {destination}
          </Text>
          {departureLabel ? (
            <View style={styles.metaRow}>
              <CalendarBlank
                size={15}
                color={theme.colors.textSecondary}
                weight="bold"
              />
              <Text style={styles.metaText} numberOfLines={1}>
                {departureLabel}
              </Text>
            </View>
          ) : null}
          <View style={styles.metaRow}>
            <MapPin
              size={15}
              color={theme.colors.textSecondary}
              weight="bold"
            />
            <Text style={styles.metaText} numberOfLines={1}>
              {kind === 'active'
                ? t('home.upcoming.activeHint')
                : t('home.upcoming.upcomingHint')}
            </Text>
          </View>
        </View>
        <View style={styles.arrowBox}>
          <ArrowRight size={18} color={theme.accents.ticket.foreground} weight="bold" />
        </View>
      </Pressable>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  section: {
    width: '100%' as const,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  eyebrowRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  accentLine: {
    width: 24,
    height: 3,
    borderRadius: borderRadius.full,
    backgroundColor: theme.accents.ticket.foreground,
  },
  eyebrow: {
    flex: 1,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  card: {
    ...theme.components.elevatedCard,
    minHeight: 108,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderCurve: 'continuous' as const,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.accents.ticket.soft,
    borderWidth: 1,
    borderColor: theme.accents.ticket.border,
  },
  content: {
    minWidth: 0,
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
  },
  metaText: {
    minWidth: 0,
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  arrowBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.accents.ticket.soft,
  },
});
