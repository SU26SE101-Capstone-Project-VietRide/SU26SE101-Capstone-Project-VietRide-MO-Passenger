import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CaretRight } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { toIntlLocale } from '@shared/utils/format';
import type { PolicySource } from '../types/policy';
import {
  policyCategoryLabel,
  policyUpdatedLabel,
} from '../utils/policyPresentation';

interface PolicyListItemProps {
  id: string;
  title: string;
  description: string;
  category: string;
  source: PolicySource;
  updatedAt: string;
  onPressId: (policyId: string) => void;
}

export const PolicyListItem = memo(function PolicyListItemView({
  id,
  title,
  description,
  category,
  source,
  updatedAt,
  onPressId,
}: PolicyListItemProps): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const locale = toIntlLocale(i18n.resolvedLanguage);
  const categoryLabel = policyCategoryLabel(category, t);
  const updatedLabel = policyUpdatedLabel(updatedAt, t, locale);
  const handlePress = useCallback(() => onPressId(id), [id, onPressId]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('policy.itemAccessibility', {
        title,
        category: categoryLabel,
        source: t(`policy.source.${source}`),
      })}
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed ? styles.pressed : null]}
    >
      <View style={styles.copy}>
        <View style={styles.metaRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{categoryLabel}</Text>
          </View>
          <Text style={styles.source}>{t(`policy.source.${source}`)}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {description.length > 0 ? (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {updatedLabel.length > 0 ? (
          <Text style={styles.updated}>{updatedLabel}</Text>
        ) : null}
      </View>
      <CaretRight
        size={16}
        color={theme.colors.textTertiary}
        weight="bold"
      />
    </Pressable>
  );
});

interface PolicySectionHeaderProps {
  source: PolicySource;
  operatorName?: string;
}

export const PolicySectionHeader = memo(function PolicySectionHeaderView({
  source,
  operatorName,
}: PolicySectionHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const title = source === 'operator'
    ? t('policy.sections.operator', {
        operator: operatorName?.trim() || t('policy.sections.operatorFallback'),
      })
    : t('policy.sections.platform');

  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  row: {
    ...theme.components.card,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
  },
  pressed: {
    opacity: 0.84,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  chip: {
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  chipText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.primary,
  },
  source: {
    flexShrink: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  description: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    color: theme.colors.textSecondary,
  },
  updated: {
    marginTop: spacing.xs,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  header: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
});
