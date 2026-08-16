import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
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
import { isUuid } from '@shared/utils/pathSegment';
import { PolicyListItem, PolicySectionHeader } from '../components/PolicyListItem';
import { usePublishedPolicies } from '../hooks/usePublishedPolicies';
import {
  flattenPolicySections,
  flattenPublishedPolicyPages,
  groupPublishedPolicies,
  type PolicyListRow,
} from '../utils/policyPresentation';

type PolicyListNavigation = NativeStackNavigationProp<RootStackParamList, 'PolicyList'>;
type PolicyListRoute = RouteProp<RootStackParamList, 'PolicyList'>;

const keyExtractor = (item: PolicyListRow): string => item.id;
const getItemType = (item: PolicyListRow): PolicyListRow['type'] => item.type;

export function PolicyListScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const navigation = useNavigation<PolicyListNavigation>();
  const route = useRoute<PolicyListRoute>();
  const operatorId = isUuid(route.params?.operatorId)
    ? route.params.operatorId
    : undefined;
  const operatorName = route.params?.operatorName?.trim();

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isRefetching,
    refetch,
  } = usePublishedPolicies({ operatorId });

  const rows = useMemo(() => {
    const policies = flattenPublishedPolicyPages(data?.pages ?? []);
    return flattenPolicySections(groupPublishedPolicies(policies));
  }, [data?.pages]);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleRetry = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => undefined);
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const handleOpenPolicy = useCallback((policyId: string) => {
    navigation.navigate('PolicyDetail', { policyId });
  }, [navigation]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<PolicyListRow>) => {
    if (item.type === 'header') {
      return (
        <PolicySectionHeader
          source={item.source}
          operatorName={operatorName}
        />
      );
    }

    return (
      <PolicyListItem
        id={item.id}
        title={item.title}
        description={item.description}
        category={item.category}
        source={item.source}
        updatedAt={item.updatedAt}
        onPressId={handleOpenPolicy}
      />
    );
  }, [handleOpenPolicy, operatorName]);

  const renderEmpty = useCallback(() => {
    if (isPending) {
      return (
        <View style={styles.statePanel}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={styles.stateTitle}>{t('policy.list.loading')}</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.statePanel}>
          <Text style={styles.stateTitle}>{t('policy.list.unavailableTitle')}</Text>
          <Text style={styles.stateBody}>
            {getLocalizedApiErrorMessage(error, t)}
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
      );
    }

    return (
      <View style={styles.statePanel}>
        <Text style={styles.stateTitle}>{t('policy.list.emptyTitle')}</Text>
        <Text style={styles.stateBody}>
          {operatorId
            ? t('policy.list.emptyOperatorDescription')
            : t('policy.list.emptyPlatformDescription')}
        </Text>
      </View>
    );
  }, [
    error,
    handleRetry,
    isPending,
    operatorId,
    styles,
    t,
    theme.colors.primary,
  ]);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }, [isFetchingNextPage, styles.footer, theme.colors.primary]);

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
          {operatorId ? t('policy.list.operatorTitle') : t('policy.list.title')}
        </Text>
        <View style={styles.topBarRightPlaceholder} />
      </View>

      <FlashList
        data={rows}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        onRefresh={handleRetry}
        refreshing={isRefetching && !isPending}
      />
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
    width: 40,
    height: 40,
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
    width: 40,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  statePanel: {
    ...theme.components.card,
    alignItems: 'center' as const,
    gap: spacing.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    borderRadius: borderRadius.lg,
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
  footer: {
    paddingVertical: spacing.lg,
  },
  pressed: {
    opacity: 0.82,
  },
});
