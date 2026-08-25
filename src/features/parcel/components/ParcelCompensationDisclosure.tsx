import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CaretDown, ShieldCheck } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import type { ParcelCompensationPolicySnapshot } from '../types';

interface ParcelCompensationDisclosureProps {
  operatorName: string | null | undefined;
  policy: ParcelCompensationPolicySnapshot;
}

export const ParcelCompensationDisclosure = React.memo(
  function ParcelCompensationDisclosureComponent({
    operatorName,
    policy,
  }: ParcelCompensationDisclosureProps): React.JSX.Element {
    const { t } = useTranslation();
    const theme = useTheme();
    const styles = useThemedStyles(createStyles);
    const [expanded, setExpanded] = useState(false);
    const displayedOperatorName = operatorName?.trim()
      || t('parcel.compensation.operatorFallback');

    return (
      <View style={styles.card}>
        <Pressable
          testID="parcel-compensation-disclosure-toggle"
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={t('parcel.compensation.title')}
          accessibilityHint={t(
            expanded
              ? 'parcel.compensation.collapseHint'
              : 'parcel.compensation.expandHint',
          )}
          onPress={() => setExpanded(current => !current)}
          style={({ pressed }) => [
            styles.toggle,
            pressed ? styles.pressed : null,
          ]}
        >
          <View style={styles.icon}>
            <ShieldCheck
              size={22}
              color={theme.colors.primary}
              weight="duotone"
            />
          </View>
          <View style={styles.copy}>
            <Text style={styles.title}>{t('parcel.compensation.title')}</Text>
            <Text style={styles.subtitle}>
              {t('parcel.compensation.subtitle', {
                operator: displayedOperatorName,
              })}
            </Text>
          </View>
          <View style={[styles.caret, expanded ? styles.caretExpanded : null]}>
            <CaretDown size={18} color={theme.colors.textSecondary} />
          </View>
        </Pressable>

        {expanded ? (
          <View style={styles.details}>
            <View style={styles.row}>
              <Text style={styles.label}>{t('parcel.compensation.rate')}</Text>
              <Text style={styles.value}>
                {t('parcel.compensation.rateValue', {
                  rate: policy.compensationRatePercent,
                })}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('parcel.compensation.cap')}</Text>
              <Text style={styles.value}>
                {formatVnd(policy.maxCompensationVnd)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>
                {t('parcel.compensation.claimWindow')}
              </Text>
              <Text style={styles.value}>
                {t('parcel.compensation.claimWindowValue', {
                  days: policy.claimWindowDays,
                })}
              </Text>
            </View>
            <Text style={styles.note}>{t('parcel.compensation.note')}</Text>
          </View>
        ) : null}
      </View>
    );
  },
);

const createStyles = (theme: AppTheme) => ({
  card: {
    ...theme.components.card,
    overflow: 'hidden' as const,
    borderRadius: borderRadius.lg,
  },
  toggle: {
    minHeight: 64,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
    padding: spacing.lg,
  },
  icon: {
    width: 36,
    height: 36,
    flexShrink: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.primaryFaded,
  },
  copy: { flex: 1, minWidth: 0 },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  caret: { flexShrink: 0 },
  caretExpanded: { transform: [{ rotate: '180deg' }] },
  details: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  row: {
    minWidth: 0,
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  label: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
  },
  value: {
    minWidth: 0,
    flexShrink: 1,
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    textAlign: 'right' as const,
  },
  note: {
    paddingTop: spacing.sm,
    color: theme.colors.textTertiary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  pressed: { opacity: 0.78 },
});
