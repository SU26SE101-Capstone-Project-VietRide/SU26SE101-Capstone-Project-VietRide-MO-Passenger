import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'phosphor-react-native';

import type { RootStackParamList } from '@app/navigation/types';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDate, toIntlLocale } from '@shared/utils/format';
import { isUuid } from '@shared/utils/pathSegment';
import { usePublishedPolicy } from '../hooks/usePublishedPolicy';
import {
  POLICY_ERROR_KEYS,
  policyCategoryLabel,
  policySourceOf,
} from '../utils/policyPresentation';

type PolicyDetailNavigation = NativeStackNavigationProp<RootStackParamList, 'PolicyDetail'>;
type PolicyDetailRoute = RouteProp<RootStackParamList, 'PolicyDetail'>;

const splitPolicyParagraphs = (content: string): string[] =>
  content
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);

export function PolicyDetailScreen(): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<PolicyDetailNavigation>();
  const route = useRoute<PolicyDetailRoute>();
  const policyId = isUuid(route.params.policyId) ? route.params.policyId : undefined;
  const { data, error, isPending, refetch } = usePublishedPolicy(policyId);
  const locale = toIntlLocale(i18n.resolvedLanguage);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);

  const paragraphs = useMemo(
    () => (data ? splitPolicyParagraphs(data.content) : []),
    [data],
  );
  const title = data?.title ?? route.params.title ?? t('policy.detail.title');
  const categoryLabel = data ? policyCategoryLabel(data.category, t) : '';
  const updatedDate = data ? formatDate(data.updatedAt, locale) : '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={handleBack}
          style={({ pressed }) => [styles.backButton, pressed ? styles.pressed : null]}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {t('policy.detail.title')}
        </Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      {isPending ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateTitle}>{t('policy.detail.loading')}</Text>
        </View>
      ) : null}

      {!isPending && error ? (
        <View style={styles.centered}>
          <Text style={styles.stateTitle}>{t('policy.detail.unavailableTitle')}</Text>
          <Text style={styles.stateBody}>
            {getLocalizedApiErrorMessage(error, t, POLICY_ERROR_KEYS)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.retryButton,
              pressed ? styles.pressed : null,
            ]}
          >
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      ) : null}

      {!isPending && data ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.metaRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{categoryLabel}</Text>
            </View>
            <Text style={styles.source}>
              {t(`policy.source.${policySourceOf(data)}`)}
            </Text>
          </View>
          <Text style={styles.headline}>{title}</Text>
          {data.description.trim().length > 0 ? (
            <Text style={styles.lede}>{data.description.trim()}</Text>
          ) : null}
          {updatedDate.length > 0 ? (
            <Text style={styles.updated}>
              {t('policy.detail.version', { version: data.version, date: updatedDate })}
            </Text>
          ) : (
            <Text style={styles.updated}>
              {t('policy.detail.versionOnly', { version: data.version })}
            </Text>
          )}
          <View style={styles.bodyCard}>
            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <Text key={`${index}:${paragraph.length}`} style={styles.paragraph}>
                  {paragraph}
                </Text>
              ))
            ) : (
              <Text style={styles.paragraph}>{t('policy.detail.emptyContent')}</Text>
            )}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  topBar: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.effects.contentBorder,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  topBarTitle: {
    flex: 1,
    textAlign: 'center' as const,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
  },
  topBarRightPlaceholder: {
    width: 44,
  },
  centered: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  headline: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xxl,
    lineHeight: fontSizes.xxl * 1.25,
    color: theme.colors.textPrimary,
  },
  lede: {
    marginTop: spacing.md,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    color: theme.colors.textSecondary,
  },
  updated: {
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  bodyCard: {
    ...theme.components.card,
    marginTop: spacing.xl,
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.lg,
  },
  paragraph: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.65,
    color: theme.colors.textPrimary,
  },
  stateTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  stateBody: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  retryButton: {
    ...theme.components.primaryButton,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  retryText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  pressed: {
    opacity: 0.82,
  },
});
