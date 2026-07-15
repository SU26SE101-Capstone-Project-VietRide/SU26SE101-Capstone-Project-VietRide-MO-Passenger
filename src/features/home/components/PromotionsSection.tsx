import React, { memo, useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { ArrowRight, Tag } from 'phosphor-react-native';

import type { PromotionItem } from '@features/booking/types';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDate, formatVnd } from '@shared/utils/format';
import {
  useHomePromotions,
  type HomePromotionService,
} from '../hooks/useHomePromotions';

const promotionKeyExtractor = (item: PromotionItem): string => item.voucherId;

const formatPromotionValue = (type: string, value: number): string => {
  const normalizedType = type.trim().toUpperCase();
  if (normalizedType.includes('PERCENT')) {
    return `${value}% off`;
  }

  return `${formatVnd(value)} off`;
};

interface PromotionCardProps {
  code: string;
  expiresAt: string;
  name: string;
  onPress?: (voucherId: string, code: string) => void;
  type: string;
  value: number;
  voucherId: string;
}

const PromotionCard = memo(function PromotionCardItem({
  code,
  expiresAt,
  name,
  onPress,
  type,
  value,
  voucherId,
}: PromotionCardProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => {
    onPress?.(voucherId, code);
  }, [code, onPress, voucherId]);
  const expiresLabel = formatDate(expiresAt) || expiresAt;
  const valueLabel = formatPromotionValue(type, value);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${name}, code ${code}`}
      disabled={!onPress}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Tag size={22} color={theme.colors.primary} weight="duotone" />
        </View>
        <Text style={styles.valueLabel}>{valueLabel}</Text>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{name}</Text>
      <View style={styles.codeRow}>
        <Text style={styles.codeLabel} numberOfLines={1}>{code}</Text>
        {onPress ? (
          <ArrowRight size={16} color={theme.colors.primary} weight="bold" />
        ) : null}
      </View>
      <Text style={styles.expiryLabel}>Valid until {expiresLabel}</Text>
    </Pressable>
  );
});

export interface PromotionsSectionProps {
  onPromotionPress?: (voucherId: string, code: string) => void;
  service?: HomePromotionService;
  title?: string;
}

export const PromotionsSection = memo(function PromotionsSectionComponent({
  onPromotionPress,
  service = 'BOOKING',
  title = 'Offers for you',
}: PromotionsSectionProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const promotionsQuery = useHomePromotions(service);
  const refetchPromotions = promotionsQuery.refetch;

  const handleRetry = useCallback(() => {
    refetchPromotions().catch(() => undefined);
  }, [refetchPromotions]);

  const renderPromotion: ListRenderItem<PromotionItem> = useCallback(({ item }) => (
    <PromotionCard
      code={item.code}
      expiresAt={item.validUntil}
      name={item.name}
      onPress={onPromotionPress}
      type={item.type}
      value={item.value}
      voucherId={item.voucherId}
    />
  ), [onPromotionPress]);

  let content: React.ReactNode;
  if (promotionsQuery.isPending) {
    content = (
      <View style={styles.stateBox} accessibilityLabel="Loading promotions">
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.stateText}>Loading current offers…</Text>
      </View>
    );
  } else if (promotionsQuery.isError) {
    content = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>Offers are unavailable</Text>
        <Text style={styles.stateText}>Pull them from VietRide again when your connection is ready.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry promotions"
          onPress={handleRetry}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  } else if (promotionsQuery.data.length === 0) {
    content = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>No active offers</Text>
        <Text style={styles.stateText}>New VietRide promotions will appear here automatically.</Text>
      </View>
    );
  } else {
    content = (
      <FlashList
        data={promotionsQuery.data}
        horizontal
        keyExtractor={promotionKeyExtractor}
        renderItem={renderPromotion}
        showsHorizontalScrollIndicator={false}
        style={styles.list}
      />
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
  sectionTitle: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
  },
  list: {
    height: 196,
  },
  card: {
    ...theme.components.card,
    width: 252,
    minHeight: 184,
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
  valueLabel: {
    flexShrink: 1,
    color: theme.colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    textAlign: 'right' as const,
  },
  cardTitle: {
    minHeight: 40,
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    lineHeight: 20,
  },
  codeRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: theme.colors.primaryFaded,
  },
  codeLabel: {
    flex: 1,
    color: theme.colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    letterSpacing: 0.4,
  },
  expiryLabel: {
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
