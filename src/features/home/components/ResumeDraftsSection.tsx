import React, { memo, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight, Package, Ticket, Trash } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@features/auth/store/useAuthStore';
import {
  isBookingDraftRestorable,
  useBookingDraftStore,
} from '@features/booking/store/useBookingDraftStore';
import { useParcelDraftStore } from '@features/parcel/store/useParcelDraftStore';
import { useParcelStore } from '@features/parcel/store/useParcelStore';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

interface ResumeDraftsSectionProps {
  onDiscardBooking: () => void;
  onDiscardParcel: () => void;
  onResumeBooking: () => void;
  onResumeParcel: () => void;
}

interface DraftCardProps {
  accessibilityLabel: string;
  caption: string;
  icon: React.ReactNode;
  onDiscard: () => void;
  onResume: () => void;
  route: string;
  title: string;
}

const DraftCard = memo(function DraftCard({
  accessibilityLabel,
  caption,
  icon,
  onDiscard,
  onResume,
  route,
  title,
}: DraftCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onResume}
        style={({ pressed }) => [
          styles.cardMain,
          pressed ? styles.pressed : null,
        ]}
      >
        <View style={styles.iconShell}>{icon}</View>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.routeText} numberOfLines={1}>
            {route}
          </Text>
          <Text style={styles.captionText} numberOfLines={1}>
            {caption}
          </Text>
        </View>
        <ArrowRight size={18} weight="bold" color={theme.colors.primary} />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('home.drafts.discardAccessibility', { title })}
        hitSlop={8}
        onPress={onDiscard}
        style={({ pressed }) => [
          styles.discardButton,
          pressed ? styles.pressed : null,
        ]}
      >
        <Trash size={16} weight="bold" color={theme.colors.textTertiary} />
      </Pressable>
    </View>
  );
});

export const ResumeDraftsSection = memo(
  function ResumeDraftsSectionComponent({
    onDiscardBooking,
    onDiscardParcel,
    onResumeBooking,
    onResumeParcel,
  }: ResumeDraftsSectionProps): React.JSX.Element | null {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);

    const currentUserId = useAuthStore(state => state.user?.id ?? null);
    const bookingOwnerUserId = useBookingDraftStore(state => state.ownerUserId);
    const bookingSnapshot = useBookingDraftStore(state => state.snapshot);
    const bookingStep = useBookingDraftStore(state => state.lastStep);
    const bookingSavedAt = useBookingDraftStore(state => state.savedAt);
    const bookingHydrated = useBookingDraftStore(state => state.hasHydrated);

    const parcelOwnerUserId = useParcelDraftStore(state => state.ownerUserId);
    const parcelStoreOwnerUserId = useParcelStore(state => state.ownerUserId);
    const parcelStep = useParcelDraftStore(state => state.lastStep);
    const parcelSavedAt = useParcelDraftStore(state => state.savedAt);
    const parcelHydrated = useParcelDraftStore(state => state.hasHydrated);
    const parcelStoreHydrated = useParcelStore(state => state.hasHydrated);
    const fromCity = useParcelStore(state => state.fromCity);
    const toCity = useParcelStore(state => state.toCity);
    const fromLocationCode = useParcelStore(state => state.fromLocationCode);
    const toLocationCode = useParcelStore(state => state.toLocationCode);

    const hasBookingDraft = Boolean(
      bookingHydrated
      && bookingSavedAt
      && isBookingDraftRestorable({
        ownerUserId: bookingOwnerUserId,
        snapshot: bookingSnapshot,
        lastStep: bookingStep,
      }),
    );
    const hasParcelDraft = Boolean(
      parcelHydrated
      && parcelStoreHydrated
      && Boolean(currentUserId)
      && parcelOwnerUserId === currentUserId
      && parcelStoreOwnerUserId === currentUserId
      && parcelSavedAt
      && fromCity.trim()
      && toCity.trim()
      && fromLocationCode.trim()
      && toLocationCode.trim(),
    );

    const orderedKinds = useMemo(() => {
      const drafts: Array<{ kind: 'booking' | 'parcel'; savedAt: number }> = [];
      if (hasBookingDraft && bookingSavedAt) {
        drafts.push({ kind: 'booking', savedAt: bookingSavedAt });
      }
      if (hasParcelDraft && parcelSavedAt) {
        drafts.push({ kind: 'parcel', savedAt: parcelSavedAt });
      }
      return drafts.sort((a, b) => b.savedAt - a.savedAt).map(item => item.kind);
    }, [bookingSavedAt, hasBookingDraft, hasParcelDraft, parcelSavedAt]);

    if (orderedKinds.length === 0) return null;

    return (
      <View style={styles.section}>
        <View style={styles.headingRow}>
          <View style={styles.headingAccent} />
          <View style={styles.headingCopy}>
            <Text style={styles.sectionTitle}>{t('home.drafts.title')}</Text>
            <Text style={styles.sectionSubtitle}>{t('home.drafts.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.cards}>
          {orderedKinds.map(kind => {
            if (kind === 'booking' && bookingSnapshot) {
              const route = `${bookingSnapshot.searchParams.from} → ${bookingSnapshot.searchParams.to}`;
              return (
                <DraftCard
                  key="booking"
                  accessibilityLabel={t('home.drafts.resumeBookingAccessibility', { route })}
                  caption={t('home.drafts.bookingStep', { step: bookingStep })}
                  icon={<Ticket size={20} weight="duotone" color={theme.colors.primary} />}
                  onDiscard={onDiscardBooking}
                  onResume={onResumeBooking}
                  route={route}
                  title={t('home.drafts.bookingTitle')}
                />
              );
            }

            const route = `${fromCity} → ${toCity}`;
            return (
              <DraftCard
                key="parcel"
                accessibilityLabel={t('home.drafts.resumeParcelAccessibility', { route })}
                caption={t('home.drafts.parcelStep', { step: parcelStep })}
                icon={<Package size={20} weight="duotone" color={theme.colors.primary} />}
                onDiscard={onDiscardParcel}
                onResume={onResumeParcel}
                route={route}
                title={t('home.drafts.parcelTitle')}
              />
            );
          })}
        </View>
      </View>
    );
  },
);

const createStyles = (theme: AppTheme) => ({
  section: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headingAccent: {
    width: 4,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primary,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  sectionSubtitle: {
    marginTop: 2,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
  cards: {
    gap: spacing.sm,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: borderRadius.xl,
    backgroundColor: theme.effects.contentSurfaceSoft,
    borderWidth: 1,
    borderColor: theme.effects.contentBorder,
  },
  cardMain: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: 52,
  },
  iconShell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryFaded,
  },
  cardCopy: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  routeText: {
    marginTop: 3,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primaryDark,
  },
  captionText: {
    marginTop: 3,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  discardButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
