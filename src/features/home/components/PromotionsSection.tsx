import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Tag } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

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
import { formatDate, formatVnd, toIntlLocale } from '@shared/utils/format';
import {
  useHomePromotions,
  type HomePromotionService,
} from '../hooks/useHomePromotions';

const promotionKeyExtractor = (item: PromotionItem): string => item.voucherId;

interface PromotionCardProps {
  code: string;
  expiresAt: string;
  name: string;
  type: string;
  value: number;
}

const PromotionCard = memo(function PromotionCardItem({
  code,
  expiresAt,
  name,
  type,
  value,
}: PromotionCardProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const intlLocale = toIntlLocale(i18n.resolvedLanguage);
  const expiresLabel = useMemo(
    () => formatDate(expiresAt, intlLocale) || expiresAt,
    [expiresAt, intlLocale],
  );
  const valueLabel = useMemo(
    () => type.trim().toUpperCase().includes('PERCENT')
      ? t('home.promotions.percentOff', { value })
      : t('home.promotions.amountOff', {
          value: formatVnd(value, { locale: intlLocale }),
        }),
    [intlLocale, t, type, value],
  );

  return (
    <View
      accessible
      accessibilityLabel={t('home.promotions.cardAccessibility', { name, code })}
      style={styles.card}
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
      </View>
      <Text style={styles.expiryLabel}>
        {t('home.promotions.validUntil', { date: expiresLabel })}
      </Text>
    </View>
  );
});

export interface PromotionsSectionProps {
  service?: HomePromotionService;
  title?: string;
}

export const PromotionsSection = memo(function PromotionsSectionComponent({
  service = 'BOOKING',
  title,
}: PromotionsSectionProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const promotionsQuery = useHomePromotions(service);

  const renderPromotion: ListRenderItem<PromotionItem> = useCallback(({ item }) => (
    <PromotionCard
      code={item.code}
      expiresAt={item.validUntil}
      name={item.name}
      type={item.type}
      value={item.value}
    />
  ), []);

  let content: React.ReactNode;
  if (promotionsQuery.isPending) {
    content = (
      <View
        style={styles.stateBox}
        accessibilityLabel={t('home.promotions.loadingAccessibility')}
      >
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={styles.stateText}>{t('home.promotions.loading')}</Text>
      </View>
    );
  } else if (promotionsQuery.isError) {
    content = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{t('home.promotions.unavailableTitle')}</Text>
        <Text style={styles.stateText}>{t('home.promotions.unavailableDescription')}</Text>
      </View>
    );
  } else if (promotionsQuery.data.length === 0) {
    content = (
      <View style={styles.stateBox}>
        <Text style={styles.stateTitle}>{t('home.promotions.emptyTitle')}</Text>
        <Text style={styles.stateText}>{t('home.promotions.emptyDescription')}</Text>
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
      <Text style={styles.sectionTitle}>{title ?? t('home.promotions.title')}</Text>
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
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
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
});
