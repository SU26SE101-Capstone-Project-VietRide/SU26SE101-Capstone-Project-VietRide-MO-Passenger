import React, { memo, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  ArrowFatUp,
  ArrowLeft,
  ClockCountdown,
  CurrencyDollar,
} from 'phosphor-react-native';

import type { ProfileStackParamList } from '@app/navigation/types';
import {
  ApiRequestError,
  getLocalizedApiErrorMessage,
} from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useFloatingTabBarContentInset, useThemedStyles } from '@shared/hooks';
import {
  borderRadius as BR,
  fontFamilies,
  fontSizes,
  spacing,
} from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { openVnPayPayment } from '@shared/payments';
import { formatVnd } from '@shared/utils/format';
import { MINIMUM_TOP_UP_AMOUNT } from '../api/walletApi';
import {
  isAmbiguousTopUpError,
  useCreateWalletTopUp,
  useWalletRefreshOnPaymentReturn,
} from '../hooks/useWallet';

type TopUpNavigation = NativeStackNavigationProp<
  ProfileStackParamList,
  'TopUp'
>;

const PRESET_AMOUNTS = [
  50_000,
  100_000,
  200_000,
  500_000,
  1_000_000,
] as const;

const TOP_UP_ERROR_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  TOP_UP_RECONCILIATION_REQUIRED: 'topUp.errors.reconciliationRequired',
  SESSION_INVALIDATED: 'topUp.errors.sessionChanged',
  AUTH_REQUIRED: 'topUp.errors.authRequired',
};

const getTopUpErrorMessage = (error: unknown, t: TFunction): string => {
  return getLocalizedApiErrorMessage(
    error,
    t,
    TOP_UP_ERROR_TRANSLATION_KEYS,
  );
};

interface PresetAmountButtonProps {
  amount: number;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (amount: number) => void;
  styles: ReturnType<typeof createStyles>;
}

const PresetAmountButton = memo(function PresetAmountButtonComponent({
  amount,
  isSelected,
  isDisabled,
  onSelect,
  styles,
}: PresetAmountButtonProps): React.JSX.Element {
  const { t } = useTranslation();
  const handlePress = useCallback(() => onSelect(amount), [amount, onSelect]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('topUp.presetAccessibility', {
        amount: formatVnd(amount),
      })}
      accessibilityState={{ disabled: isDisabled, selected: isSelected }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.presetButton,
        isSelected ? styles.presetButtonSelected : null,
        pressed ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
      ]}
    >
      <Text
        style={[
          styles.presetButtonText,
          isSelected ? styles.presetButtonTextSelected : null,
        ]}
      >
        {formatVnd(amount)}
      </Text>
    </Pressable>
  );
});

export function TopUpScreen(): React.JSX.Element {
  const navigation = useNavigation<TopUpNavigation>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const bottomTabClearance = useFloatingTabBarContentInset();
  const topUpMutation = useCreateWalletTopUp();
  const {
    completePaymentReturn,
    data: topUpResult,
    isPending: isTopUpPending,
    mutateAsync: submitTopUp,
  } = topUpMutation;
  const submissionInProgressRef = useRef(false);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100_000);
  const [customAmount, setCustomAmount] = useState('');
  const [returnRefreshStatus, setReturnRefreshStatus] = useState<
    'success' | 'error' | null
  >(null);

  const handlePaymentReturn = useCallback((didRefresh: boolean) => {
    completePaymentReturn();
    setReturnRefreshStatus(didRefresh ? 'success' : 'error');
  }, [completePaymentReturn]);
  const paymentReturn = useWalletRefreshOnPaymentReturn(handlePaymentReturn);
  const {
    armPaymentReturn,
    cancelPaymentReturn,
    isAwaitingReturn,
  } = paymentReturn;

  const parsedCustomAmount = customAmount.length > 0
    ? Number.parseInt(customAmount, 10)
    : 0;
  const amount = customAmount.length > 0
    ? parsedCustomAmount
    : (selectedPreset ?? 0);
  const isAmountValid = Number.isSafeInteger(amount)
    && amount >= MINIMUM_TOP_UP_AMOUNT;
  const isBusy = isTopUpPending || isAwaitingReturn;
  const pendingRequestId = topUpResult?.topUpRequestId;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);
  const handlePresetSelect = useCallback((nextAmount: number) => {
    setSelectedPreset(nextAmount);
    setCustomAmount('');
    setReturnRefreshStatus(null);
  }, []);
  const handleCustomAmountChange = useCallback((value: string) => {
    const digitsOnly = value.replace(/\D/g, '');
    setCustomAmount(digitsOnly);
    if (digitsOnly.length > 0) {
      setSelectedPreset(null);
    }
    setReturnRefreshStatus(null);
  }, []);

  const handleTopUp = useCallback(async () => {
    if (
      !isAmountValid
      || isBusy
      || submissionInProgressRef.current
    ) {
      return;
    }

    submissionInProgressRef.current = true;
    setReturnRefreshStatus(null);

    try {
      const result = await submitTopUp(amount);

      if (result.status !== 'PENDING') {
        completePaymentReturn();
        Alert.alert(
          t('topUp.statusTitle'),
          t('topUp.unexpectedStatus', {
            status: t(`topUp.status.${result.status.toLowerCase()}`),
          }),
        );
        return;
      }

      if (!armPaymentReturn()) {
        throw new ApiRequestError({
          code: 'AUTH_REQUIRED',
          message: 'topUp.errors.authRequired',
          statusCode: 401,
        });
      }

      try {
        await openVnPayPayment({
          result,
          kind: 'topup',
          businessId: result.topUpRequestId,
        });
      } catch {
        cancelPaymentReturn();
        Alert.alert(
          t('topUp.redirectErrorTitle'),
          t('topUp.redirectErrorDescription'),
        );
      }
    } catch (error: unknown) {
      cancelPaymentReturn();
      const retrySafetyMessage = isAmbiguousTopUpError(error)
        ? t('topUp.ambiguousRetryHint')
        : '';
      const message = [getTopUpErrorMessage(error, t), retrySafetyMessage]
        .filter(Boolean)
        .join('\n\n');

      Alert.alert(
        t('topUp.errorTitle'),
        message,
      );
    } finally {
      submissionInProgressRef.current = false;
    }
  }, [
    amount,
    armPaymentReturn,
    cancelPaymentReturn,
    completePaymentReturn,
    isAmountValid,
    isBusy,
    submitTopUp,
    t,
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
        <Text style={styles.headerTitle}>
          {t('topUp.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomTabClearance }]}
          scrollIndicatorInsets={{ bottom: bottomTabClearance }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isAwaitingReturn ? (
            <View style={styles.pendingNotice}>
              <ClockCountdown size={22} color={theme.colors.warning} />
              <View style={styles.noticeCopy}>
                <Text style={styles.pendingNoticeTitle}>
                  {t('topUp.pendingTitle')}
                </Text>
                <Text style={styles.pendingNoticeText}>
                  {t('topUp.pendingDescription')}
                </Text>
                {pendingRequestId ? (
                  <Text style={styles.requestIdText} numberOfLines={1}>
                    {t('topUp.requestId', { id: pendingRequestId })}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {returnRefreshStatus ? (
            <View style={styles.returnNotice}>
              <Text style={styles.returnNoticeText}>
                {returnRefreshStatus === 'success'
                  ? t('topUp.returnNotice')
                  : t('topUp.returnRefreshFailed')}
              </Text>
            </View>
          ) : null}

          <View style={styles.amountCard}>
            <CurrencyDollar size={28} color={theme.colors.primary} />
            <Text style={styles.amountLabel}>
              {t('topUp.amount')}
            </Text>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              numberOfLines={1}
              style={[
                styles.amountValue,
                amount > 0 && !isAmountValid ? styles.amountValueError : null,
              ]}
            >
              {amount > 0 ? formatVnd(amount) : t('common.notAvailable')}
            </Text>
            {amount > 0 && !isAmountValid ? (
              <Text style={styles.amountHint}>
                {t('topUp.minimumHint', {
                  amount: formatVnd(MINIMUM_TOP_UP_AMOUNT),
                })}
              </Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>
            {t('topUp.quickSelect')}
          </Text>
          <View style={styles.presetGrid}>
            {PRESET_AMOUNTS.map((presetAmount) => (
              <PresetAmountButton
                key={presetAmount}
                amount={presetAmount}
                isSelected={selectedPreset === presetAmount}
                isDisabled={isBusy}
                onSelect={handlePresetSelect}
                styles={styles}
              />
            ))}
          </View>

          <Text style={styles.sectionTitle}>
            {t('topUp.customAmount')}
          </Text>
          <TextInput
            accessibilityLabel={t('topUp.customAmountAccessibility')}
            editable={!isBusy}
            keyboardType="number-pad"
            maxLength={12}
            onChangeText={handleCustomAmountChange}
            placeholder={t('topUp.customPlaceholder')}
            placeholderTextColor={theme.colors.textTertiary}
            returnKeyType="done"
            style={styles.customInput}
            value={customAmount}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('topUp.confirm')}
            accessibilityState={{ disabled: !isAmountValid || isBusy }}
            disabled={!isAmountValid || isBusy}
            onPress={handleTopUp}
            style={({ pressed }) => [
              styles.submitButton,
              !isAmountValid || isBusy ? styles.disabled : null,
              pressed ? styles.submitButtonPressed : null,
            ]}
          >
            {isTopUpPending ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : isAwaitingReturn ? (
              <>
                <ClockCountdown size={18} color={theme.colors.textInverse} />
                <Text style={styles.submitButtonText}>
                  {t('topUp.awaitingReturn')}
                </Text>
              </>
            ) : (
              <>
                <ArrowFatUp
                  size={18}
                  color={theme.colors.textInverse}
                  weight="fill"
                />
                <Text style={styles.submitButtonText}>
                  {pendingRequestId
                    ? t('topUp.openAgain')
                    : t('topUp.confirm')}
                </Text>
              </>
            )}
          </Pressable>

          <Text style={styles.vnpayNote}>
            {t('topUp.vnpayNote')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  safeArea: {
    ...theme.components.screen,
  },
  header: {
    height: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.effects.isLiquid
      ? theme.effects.contentBorderStrong
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceElevated
      : theme.colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.huge,
  },
  pendingNotice: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.warning,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.warningLight,
  },
  noticeCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  pendingNoticeTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textPrimary,
  },
  pendingNoticeText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  requestIdText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  returnNotice: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  returnNoticeText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textSecondary,
  },
  amountCard: {
    ...theme.components.elevatedCard,
    alignItems: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  amountLabel: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  amountValue: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.h1,
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  amountValueError: {
    color: theme.colors.error,
  },
  amountHint: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.error,
    textAlign: 'center' as const,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
  presetGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  presetButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: BR.full,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.transparent,
  },
  presetButtonSelected: {
    backgroundColor: theme.colors.primary,
  },
  presetButtonText: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    color: theme.colors.primary,
  },
  presetButtonTextSelected: {
    color: theme.colors.textInverse,
  },
  customInput: {
    minHeight: 52,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid
      ? theme.effects.fieldBorder
      : theme.colors.border,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.fieldSurface
      : theme.colors.surface,
  },
  submitButton: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: BR.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  submitButtonPressed: {
    opacity: 0.86,
  },
  submitButtonText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    color: theme.colors.textInverse,
    textAlign: 'center' as const,
  },
  vnpayNote: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
    color: theme.colors.textTertiary,
    textAlign: 'center' as const,
  },
  pressed: {
    opacity: 0.8,
  },
  disabled: {
    opacity: 0.5,
  },
});
