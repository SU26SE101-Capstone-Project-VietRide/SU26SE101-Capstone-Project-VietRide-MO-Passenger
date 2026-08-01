import React, { memo, useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ArrowCounterClockwise,
  ArrowFatUp,
  ArrowLeft,
  CaretRight,
  CreditCard,
  Money,
} from 'phosphor-react-native';

import type { ProfileStackParamList } from '@app/navigation/types';
import { getLocalizedApiErrorMessage } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
} from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { formatDateTime, formatVnd } from '@shared/utils/format';
import {
  flattenWalletTransactionPages,
  type WalletTransaction,
  type WalletTransactionReferenceType,
  type WalletTransactionType,
} from '../api/walletApi';
import { useWalletBalance, useWalletTransactions } from '../hooks/useWallet';
import {
  COMING_SOON_FINANCIAL_ROUTES,
  getFinancialUnavailableNotice,
  type ComingSoonFinancialRoute,
} from '../config/financialCapabilities';

type WalletNavigation = NativeStackNavigationProp<
  ProfileStackParamList,
  'Wallet'
>;

interface ComingSoonActionProps {
  onOpen: (route: ComingSoonFinancialRoute) => void;
  route: ComingSoonFinancialRoute;
}

const ComingSoonAction = memo(function ComingSoonActionItem({
  onOpen,
  route,
}: ComingSoonActionProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handlePress = useCallback(() => onOpen(route), [onOpen, route]);
  const Icon = route === 'Withdraw' ? Money : CreditCard;
  const title = t(getFinancialUnavailableNotice(route).titleKey);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('financial.comingSoonAccessibility', { title })}
      accessibilityHint={t('financial.comingSoonHint')}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.comingSoonAction,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.comingSoonIcon}>
        <Icon size={18} color={theme.colors.primary} weight="duotone" />
      </View>
      <Text style={styles.comingSoonTitle} numberOfLines={2}>{title}</Text>
      <View style={styles.comingSoonBadge}>
        <Text style={styles.comingSoonBadgeText}>{t('financial.comingSoon')}</Text>
      </View>
      <CaretRight size={16} color={theme.colors.textTertiary} weight="bold" />
    </Pressable>
  );
});

const getTransactionTitle = (
  referenceType: WalletTransactionReferenceType,
  note: string | null,
  t: TFunction,
): string => {
  const normalizedNote = note?.trim();
  if (normalizedNote) {
    return normalizedNote;
  }

  switch (referenceType) {
    case 'TOP_UP':
      return t('wallet.transactions.topUp');
    case 'BOOKING_PAYMENT':
      return t('wallet.transactions.bookingPayment');
    case 'BOOKING_REFUND':
      return t('wallet.transactions.bookingRefund');
    case 'PARCEL_PAYMENT':
      return t('wallet.transactions.parcelPayment');
    case 'PARCEL_REFUND':
      return t('wallet.transactions.parcelRefund');
    case 'PARCEL_ADDITIONAL_PAYMENT':
      return t('wallet.transactions.parcelAdditionalPayment');
    case 'MANUAL_ADJUSTMENT':
      return t('wallet.transactions.manualAdjustment');
    default:
      return t('wallet.transactions.generic');
  }
};

const TransactionIcon = ({
  referenceType,
  color,
}: {
  referenceType: WalletTransactionReferenceType;
  color: string;
}): React.JSX.Element => {
  switch (referenceType) {
    case 'TOP_UP':
      return <ArrowFatUp size={20} color={color} weight="fill" />;
    case 'BOOKING_REFUND':
    case 'PARCEL_REFUND':
      return <ArrowCounterClockwise size={20} color={color} />;
    case 'BOOKING_PAYMENT':
    case 'PARCEL_PAYMENT':
    case 'PARCEL_ADDITIONAL_PAYMENT':
      return <CreditCard size={20} color={color} />;
    case 'MANUAL_ADJUSTMENT':
      return <Money size={20} color={color} />;
    default:
      return <Money size={20} color={color} />;
  }
};

interface TransactionRowProps {
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  referenceType: WalletTransactionReferenceType;
  note: string | null;
  createdAt: string;
}

const TransactionRow = memo(function TransactionRowComponent({
  type,
  amount,
  balanceAfter,
  referenceType,
  note,
  createdAt,
}: TransactionRowProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isCredit = type === 'CREDIT';
  const iconColor = isCredit ? theme.colors.success : theme.colors.error;

  return (
    <View style={styles.transactionRow}>
      <View
        style={[
          styles.transactionIcon,
          isCredit ? styles.creditIcon : styles.debitIcon,
        ]}
      >
        <TransactionIcon referenceType={referenceType} color={iconColor} />
      </View>

      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle} numberOfLines={2}>
          {getTransactionTitle(referenceType, note, t)}
        </Text>
        <Text style={styles.transactionDate}>{formatDateTime(createdAt)}</Text>
      </View>

      <View style={styles.transactionAmountGroup}>
        <Text
          style={[
            styles.transactionAmount,
            isCredit ? styles.creditAmount : styles.debitAmount,
          ]}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          numberOfLines={1}
        >
          {isCredit ? '+' : '-'}
          {formatVnd(Math.abs(amount))}
        </Text>
        <Text style={styles.balanceAfter} numberOfLines={1}>
          {t('wallet.transactions.balanceAfter', {
            amount: formatVnd(balanceAfter),
          })}
        </Text>
      </View>
    </View>
  );
});

export function WalletScreen(): React.JSX.Element {
  const navigation = useNavigation<WalletNavigation>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const balanceQuery = useWalletBalance();
  const transactionsQuery = useWalletTransactions();
  const {
    data: balanceData,
    error: balanceError,
    isError: isBalanceError,
    isPending: isBalancePending,
    isRefetchError: isBalanceRefetchError,
    isRefetching: isBalanceRefetching,
    refetch: refetchBalance,
  } = balanceQuery;
  const {
    data: transactionsData,
    error: transactionsError,
    fetchNextPage,
    hasNextPage,
    isError: isTransactionsError,
    isFetchNextPageError,
    isFetchingNextPage,
    isPending: isTransactionsPending,
    isRefetchError: isTransactionsRefetchError,
    isRefetching: isTransactionsRefetching,
    refetch: refetchTransactions,
  } = transactionsQuery;

  const transactions = useMemo(
    () => flattenWalletTransactionPages(transactionsData?.pages),
    [transactionsData?.pages],
  );

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handleTopUp = useCallback(
    () => navigation.navigate('TopUp'),
    [navigation],
  );
  const handleOpenComingSoon = useCallback((route: ComingSoonFinancialRoute) => {
    switch (route) {
      case 'Withdraw':
        navigation.navigate('Withdraw');
        break;
      case 'SavedPayments':
        navigation.navigate('SavedPayments');
        break;
      case 'AddPaymentMethod':
        navigation.navigate('AddPaymentMethod');
        break;
    }
  }, [navigation]);
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchBalance(), refetchTransactions()]);
  }, [refetchBalance, refetchTransactions]);
  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage().catch(() => undefined);
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  const handleRetryTransactions = useCallback(() => {
    refetchTransactions().catch(() => undefined);
  }, [refetchTransactions]);
  const handleRetryNextPage = useCallback(() => {
    fetchNextPage().catch(() => undefined);
  }, [fetchNextPage]);
  const handleRetryBalance = useCallback(() => {
    refetchBalance().catch(() => undefined);
  }, [refetchBalance]);

  const renderTransaction = useCallback(
    ({ item }: ListRenderItemInfo<WalletTransaction>) => (
      <TransactionRow
        type={item.type}
        amount={item.amount}
        balanceAfter={item.balanceAfter}
        referenceType={item.referenceType}
        note={item.note}
        createdAt={item.createdAt}
      />
    ),
    [],
  );
  const keyExtractor = useCallback(
    (item: WalletTransaction) => item.id,
    [],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>
          {t('wallet.balance')}
        </Text>

        {isBalancePending ? (
          <ActivityIndicator
            color={theme.colors.textInverse}
            style={styles.balanceLoader}
          />
        ) : isBalanceError && !balanceData ? (
          <View style={styles.balanceErrorGroup}>
            <Text style={styles.balanceErrorText}>
              {getLocalizedApiErrorMessage(balanceError, t)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.retry')}
              onPress={handleRetryBalance}
              style={styles.retryBalanceButton}
            >
              <Text style={styles.retryBalanceText}>
                {t('common.retry')}
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={styles.balanceAmount}
            >
              {formatVnd(balanceData?.balance ?? 0)}
            </Text>
            {isBalanceRefetchError ? (
              <Text style={styles.staleDataText}>
                {t('wallet.staleBalance')}
              </Text>
            ) : null}
          </>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('wallet.topUp')}
          onPress={handleTopUp}
          style={({ pressed }) => [
            styles.topUpButton,
            pressed ? styles.pressed : null,
          ]}
        >
          <ArrowFatUp size={16} color={theme.colors.primary} weight="fill" />
          <Text style={styles.topUpButtonText}>
            {t('wallet.topUp')}
          </Text>
        </Pressable>

        <View style={styles.comingSoonSection}>
          <Text style={styles.comingSoonSectionTitle}>
            {t('wallet.moreTools')}
          </Text>
          {COMING_SOON_FINANCIAL_ROUTES.map((routeName) => (
            <ComingSoonAction
              key={routeName}
              route={routeName}
              onOpen={handleOpenComingSoon}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>
          {t('wallet.recentTransactions')}
        </Text>
        {isTransactionsRefetchError && transactions.length > 0 ? (
          <Text style={styles.ledgerStaleText}>
            {t('wallet.staleTransactions')}
          </Text>
        ) : null}
      </View>
    ),
    [
      balanceData,
      balanceError,
      handleRetryBalance,
      handleOpenComingSoon,
      handleTopUp,
      isBalanceError,
      isBalancePending,
      isBalanceRefetchError,
      isTransactionsRefetchError,
      styles,
      t,
      theme.colors.primary,
      theme.colors.textInverse,
      transactions.length,
    ],
  );

  const listEmpty = useMemo(() => {
    if (isTransactionsPending) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }

    if (isTransactionsError) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.errorTitle}>
            {t('wallet.loadTransactionsFailed')}
          </Text>
          <Text style={styles.errorMessage}>
            {getLocalizedApiErrorMessage(transactionsError, t)}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.retry')}
            onPress={handleRetryTransactions}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>
              {t('common.retry')}
            </Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Money size={48} color={theme.colors.textTertiary} weight="thin" />
        <Text style={styles.emptyText}>
          {t('wallet.noTransactions')}
        </Text>
      </View>
    );
  }, [
    handleRetryTransactions,
    styles,
    t,
    theme.colors.primary,
    theme.colors.textTertiary,
    isTransactionsError,
    isTransactionsPending,
    transactionsError,
  ]);

  const listFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <ActivityIndicator
          color={theme.colors.primary}
          style={styles.footerLoader}
        />
      );
    }

    if (isFetchNextPageError) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('wallet.retryMore')}
          onPress={handleRetryNextPage}
          style={styles.footerRetry}
        >
          <Text style={styles.footerRetryText}>
            {t('wallet.retryMore')}
          </Text>
        </Pressable>
      );
    }

    return null;
  }, [
    handleRetryNextPage,
    styles,
    t,
    theme.colors.primary,
    isFetchNextPageError,
    isFetchingNextPage,
  ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={8}
          onPress={handleBack}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} weight="bold" />
        </Pressable>
        <Text style={styles.headerTitle}>{t('wallet.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlashList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        onRefresh={handleRefresh}
        refreshing={
          isBalanceRefetching
          || (isTransactionsRefetching && !isFetchingNextPage)
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: spacing.huge,
    backgroundColor: theme.colors.background,
  },
  balanceCard: {
    alignItems: 'center' as const,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderCurve: 'continuous' as const,
    gap: spacing.sm,
  },
  balanceLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
    opacity: 0.76,
  },
  balanceLoader: {
    marginVertical: spacing.md,
  },
  balanceAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: 40,
    color: theme.colors.textInverse,
    letterSpacing: -1,
  },
  balanceErrorGroup: {
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  balanceErrorText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
    textAlign: 'center' as const,
  },
  retryBalanceButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.textInverse,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
  },
  retryBalanceText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
  },
  staleDataText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textInverse,
    opacity: 0.82,
  },
  topUpButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.textInverse,
  },
  topUpButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.primary,
  },
  comingSoonSection: {
    width: '100%' as const,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  comingSoonSectionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  comingSoonAction: {
    minHeight: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceStrong
      : theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
  },
  comingSoonIcon: {
    width: 32,
    height: 32,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  comingSoonTitle: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  comingSoonBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.surfaceAlt,
  },
  comingSoonBadgeText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  pressed: {
    opacity: 0.82,
  },
  sectionTitle: {
    alignSelf: 'flex-start' as const,
    marginTop: spacing.lg,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
  },
  ledgerStaleText: {
    alignSelf: 'flex-start' as const,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textInverse,
    opacity: 0.82,
  },
  transactionRow: {
    minHeight: 76,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.background,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    marginRight: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  creditIcon: {
    backgroundColor: theme.colors.successLight,
  },
  debitIcon: {
    backgroundColor: theme.colors.errorLight,
  },
  transactionInfo: {
    flex: 1,
    gap: 2,
  },
  transactionTitle: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  transactionDate: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  transactionAmountGroup: {
    maxWidth: '42%' as const,
    alignItems: 'flex-end' as const,
    marginLeft: spacing.sm,
    gap: 2,
  },
  transactionAmount: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
  },
  creditAmount: {
    color: theme.colors.success,
  },
  debitAmount: {
    color: theme.colors.error,
  },
  balanceAfter: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  emptyState: {
    minHeight: 240,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textTertiary,
  },
  errorTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center' as const,
  },
  errorMessage: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center' as const,
  },
  retryButton: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  retryButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
  footerLoader: {
    marginVertical: spacing.xl,
  },
  footerRetry: {
    alignItems: 'center' as const,
    padding: spacing.lg,
  },
  footerRetryText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
});
