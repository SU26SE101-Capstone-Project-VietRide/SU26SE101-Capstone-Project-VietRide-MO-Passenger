import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, FileText, ShieldCheck } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ParcelStackParamList } from '@app/navigation/types';
import { AppKeyboardAwareScrollView, Input } from '@shared/components';
import { getLocalizedApiErrorMessage, toApiError } from '@shared/api/errors';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatDateTime, formatVnd } from '@shared/utils/format';
import {
  useAppealParcelClaim,
  useParcelClaims,
  useParcelTrace,
  useSubmitParcelClaim,
} from '../hooks/useParcelReliabilityQueries';

import { PARCEL_ERROR_TRANSLATION_KEYS } from '../utils/parcelPresentation';
type ClaimRoute = RouteProp<ParcelStackParamList, 'ParcelClaim'>;
type ClaimNavigation = NativeStackNavigationProp<ParcelStackParamList, 'ParcelClaim'>;

// BE v1.92 requires a nonblank appeal reason but does not publish a max length.
// This is a Passenger safety/UX bound, not a server-contract constraint.
const APPEAL_MAX_LENGTH = 2_000;

export function ParcelClaimScreen(): React.JSX.Element {
  const route = useRoute<ClaimRoute>();
  const navigation = useNavigation<ClaimNavigation>();
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const { parcelId } = route.params;
  const traceQuery = useParcelTrace(parcelId);
  const trace = traceQuery.data?.pages[0];
  const canLoadClaims = Boolean(
    trace?.claimSummary || trace?.availableActions.includes('SUBMIT_CLAIM'),
  );
  const claimsQuery = useParcelClaims(parcelId, canLoadClaims);
  const submitMutation = useSubmitParcelClaim(parcelId);
  const appealMutation = useAppealParcelClaim(parcelId);
  const [appealReason, setAppealReason] = useState('');
  const [appealError, setAppealError] = useState<string | null>(null);
  const claim = claimsQuery.data?.[0];
  const canSubmitClaim = trace?.availableActions.includes('SUBMIT_CLAIM') ?? false;
  const canAppeal = claim?.availableActions.includes('APPEAL') ?? false;
  const policy = claim?.policySnapshot;

  const refresh = useCallback(() => {
    Promise.all([
      traceQuery.refetch(),
      canLoadClaims ? claimsQuery.refetch() : Promise.resolve(),
    ]).catch(() => undefined);
  }, [canLoadClaims, claimsQuery, traceQuery]);

  const handleSubmitClaim = useCallback(async () => {
    try {
      await submitMutation.mutateAsync();
      Alert.alert(t('parcel.claim.submittedTitle'), t('parcel.claim.submittedDescription'));
    } catch (error) {
      Alert.alert(
        t('parcel.claim.errorTitle'),
        getLocalizedApiErrorMessage(error, t, PARCEL_ERROR_TRANSLATION_KEYS),
      );
    }
  }, [submitMutation, t]);

  const trimmedAppealReason = appealReason.trim();
  const appealReasonTooLong = appealReason.length > APPEAL_MAX_LENGTH;
  const appealLengthError = useMemo(() => {
    if (appealError) return appealError;
    if (appealReasonTooLong) {
      return t('parcel.claim.appealTooLong');
    }
    return null;
  }, [appealError, appealReasonTooLong, t]);

  const handleAppeal = useCallback(async () => {
    if (!claim || !trimmedAppealReason) {
      setAppealError(t('parcel.claim.appealRequired'));
      return;
    }
    if (appealReasonTooLong) {
      setAppealError(t('parcel.claim.appealTooLong'));
      return;
    }
    try {
      setAppealError(null);
      await appealMutation.mutateAsync({
        parcelId,
        claimId: claim.claimId,
        reason: trimmedAppealReason,
      });
      setAppealReason('');
      Alert.alert(t('parcel.claim.appealedTitle'), t('parcel.claim.appealedDescription'));
    } catch (error) {
      const apiError = toApiError(error);
      const reasonError = apiError.fields.find((field) => (
        ['reason', 'appealreason'].includes(field.field.toLowerCase())
      ));
      if (reasonError) {
        setAppealError(reasonError.message);
        return;
      }
      Alert.alert(
        t('parcel.claim.errorTitle'),
        getLocalizedApiErrorMessage(error, t, PARCEL_ERROR_TRANSLATION_KEYS),
      );
    }
  }, [
    appealMutation,
    appealReasonTooLong,
    claim,
    parcelId,
    t,
    trimmedAppealReason,
  ]);

  const isLoading = traceQuery.isLoading || (canLoadClaims && claimsQuery.isLoading);
  const isBlockingError = (
    (!trace && traceQuery.isError)
    || (
      canLoadClaims
      && claimsQuery.data === undefined
      && claimsQuery.isError
    )
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('parcel.claim.title')}</Text>
        <View style={styles.headerButton} />
      </View>
      <View style={styles.body}>
        {isLoading ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.stateText}>{t('parcel.claim.loading')}</Text>
          </View>
        ) : isBlockingError ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>{t('parcel.claim.errorTitle')}</Text>
            <Pressable accessibilityRole="button" onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : (
          <AppKeyboardAwareScrollView
            style={styles.body}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            refreshControl={(
              <RefreshControl
                refreshing={traceQuery.isRefetching || claimsQuery.isRefetching}
                onRefresh={refresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            )}
          >
            <View style={styles.heroCard}>
              <ShieldCheck size={28} color={theme.colors.primary} weight="duotone" />
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>
                  {claim ? t('parcel.claim.existingTitle') : t('parcel.claim.eligibilityTitle')}
                </Text>
                <Text style={styles.heroText}>
                  {claim
                    ? t('parcel.claim.statusDescription', { status: claim.status })
                    : t('parcel.claim.eligibilityDescription')}
                </Text>
              </View>
            </View>

            {canSubmitClaim && !claim ? (
              <Pressable
                accessibilityRole="button"
                disabled={submitMutation.isPending}
                onPress={() => { handleSubmitClaim().catch(() => undefined); }}
                style={({ pressed }) => [styles.primaryButton, pressed ? styles.pressed : null]}
              >
                {submitMutation.isPending
                  ? <ActivityIndicator color={theme.colors.textInverse} />
                  : <Text style={styles.primaryButtonText}>{t('parcel.claim.submit')}</Text>}
              </Pressable>
            ) : null}

            {claim ? (
              <>
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>{t('parcel.claim.awardTitle')}</Text>
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>{t('parcel.claim.status')}</Text>
                    <Text style={styles.valueText}>{claim.status}</Text>
                  </View>
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>{t('parcel.claim.cargoAward')}</Text>
                    <Text style={styles.valueText}>{formatVnd(claim.cargoAwardVnd)}</Text>
                  </View>
                  <View style={styles.valueRow}>
                    <Text style={styles.valueLabel}>{t('parcel.claim.freightRefund')}</Text>
                    <Text style={styles.valueText}>{formatVnd(claim.freightRefundVnd)}</Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>{t('parcel.claim.totalAward')}</Text>
                    <Text style={styles.totalValue}>{formatVnd(claim.totalAwardVnd)}</Text>
                  </View>
                  {claim.decisionDeadline ? (
                    <Text style={styles.deadlineText}>
                      {t('parcel.claim.decisionDeadline', {
                        time: formatDateTime(claim.decisionDeadline),
                      })}
                    </Text>
                  ) : null}
                  {claim.payoutDeadline ? (
                    <Text style={styles.deadlineText}>
                      {t('parcel.claim.payoutDeadline', {
                        time: formatDateTime(claim.payoutDeadline),
                      })}
                    </Text>
                  ) : null}
                  {claim.paidAt ? (
                    <Text style={styles.paidText}>
                      {t('parcel.claim.paidAt', { time: formatDateTime(claim.paidAt) })}
                    </Text>
                  ) : (
                    <Text style={styles.pendingText}>{t('parcel.claim.notPaidYet')}</Text>
                  )}
                </View>

                {policy ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('parcel.claim.policyTitle')}</Text>
                    <Text style={styles.policyText}>
                      {t('parcel.claim.policyDescription', {
                        rate: policy.compensationRatePercent,
                        cap: formatVnd(policy.maxCompensationVnd),
                        days: policy.claimWindowDays,
                      })}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.card}>
                  <View style={styles.evidenceHeader}>
                    <FileText size={20} color={theme.colors.primary} />
                    <Text style={styles.sectionTitle}>{t('parcel.claim.evidenceTitle')}</Text>
                  </View>
                  {claim.evidence.length > 0 ? claim.evidence.map((evidence) => (
                    <View key={evidence.evidenceId} style={styles.evidenceRow}>
                      <Text style={styles.evidenceType}>{evidence.evidenceType}</Text>
                      <Text style={styles.evidenceReference} numberOfLines={2}>
                        {evidence.reference}
                      </Text>
                      {evidence.note ? <Text style={styles.evidenceNote}>{evidence.note}</Text> : null}
                    </View>
                  )) : (
                    <Text style={styles.emptyText}>{t('parcel.claim.noEvidence')}</Text>
                  )}
                  <Text style={styles.blockedText}>{t('parcel.claim.evidenceUploadBlocked')}</Text>
                </View>

                {canAppeal ? (
                  <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('parcel.claim.appealTitle')}</Text>
                    <Input
                      required
                      multiline
                      numberOfLines={5}
                      maxLength={APPEAL_MAX_LENGTH + 1}
                      label={t('parcel.claim.appealReasonLabel')}
                      placeholder={t('parcel.claim.appealReasonPlaceholder')}
                      error={appealLengthError ?? undefined}
                      value={appealReason}
                      onChangeText={(value) => {
                        setAppealReason(value);
                        if (appealError) setAppealError(null);
                      }}
                      inputStyle={styles.textArea}
                      textAlignVertical="top"
                    />
                    <Pressable
                      testID="parcel-claim-appeal-submit"
                      accessibilityRole="button"
                      disabled={
                        !trimmedAppealReason
                        || appealReasonTooLong
                        || appealMutation.isPending
                      }
                      onPress={() => { handleAppeal().catch(() => undefined); }}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        (
                          !trimmedAppealReason
                          || appealReasonTooLong
                          || appealMutation.isPending
                        )
                          ? styles.disabled
                          : null,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      {appealMutation.isPending
                        ? <ActivityIndicator color={theme.colors.textInverse} />
                        : <Text style={styles.primaryButtonText}>{t('parcel.claim.appeal')}</Text>}
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : !canSubmitClaim ? (
              <View style={styles.card}>
                <Text style={styles.emptyText}>{t('parcel.claim.unavailable')}</Text>
              </View>
            ) : null}
          </AppKeyboardAwareScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  body: { flex: 1 },
  header: { minHeight: 56, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  headerButton: { width: 44, height: 44, flexShrink: 0, alignItems: 'center' as const, justifyContent: 'center' as const },
  headerTitle: { flex: 1, minWidth: 0, paddingHorizontal: spacing.sm, color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.lg, textAlign: 'center' as const },
  content: { flexGrow: 1, gap: spacing.md, padding: spacing.xl, paddingBottom: spacing.huge },
  state: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing.md, padding: spacing.xl },
  stateTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md },
  stateText: { color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.sm },
  retryButton: { minHeight: 44, justifyContent: 'center' as const, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md, backgroundColor: theme.colors.primary },
  retryText: { color: theme.colors.textInverse, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  heroCard: { flexDirection: 'row' as const, gap: spacing.md, padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: theme.colors.primaryFaded },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md },
  heroText: { marginTop: spacing.xs, color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, lineHeight: 20 },
  card: { ...theme.components.card, padding: spacing.lg, borderRadius: borderRadius.lg },
  sectionTitle: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md, marginBottom: spacing.md },
  valueRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: spacing.md, marginBottom: spacing.sm },
  valueLabel: { flex: 1, color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.sm },
  valueText: { minWidth: 0, flexShrink: 1, color: theme.colors.textPrimary, fontFamily: fontFamilies.medium, fontSize: fontSizes.sm, textAlign: 'right' as const },
  totalRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  totalLabel: { flex: 1, minWidth: 0, color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.sm },
  totalValue: { minWidth: 0, flexShrink: 1, color: theme.colors.primary, fontFamily: fontFamilies.bold, fontSize: fontSizes.md, textAlign: 'right' as const },
  deadlineText: { marginTop: spacing.sm, color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs },
  paidText: { marginTop: spacing.sm, color: theme.colors.success, fontFamily: fontFamilies.medium, fontSize: fontSizes.xs },
  pendingText: { marginTop: spacing.sm, color: theme.colors.warning, fontFamily: fontFamilies.medium, fontSize: fontSizes.xs },
  policyText: { color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, lineHeight: 21 },
  evidenceHeader: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing.sm },
  evidenceRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: theme.colors.divider },
  evidenceType: { color: theme.colors.textPrimary, fontFamily: fontFamilies.bold, fontSize: fontSizes.xs },
  evidenceReference: { marginTop: 2, color: theme.colors.primary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs },
  evidenceNote: { marginTop: 2, color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.xs },
  emptyText: { color: theme.colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: fontSizes.sm },
  blockedText: { marginTop: spacing.md, color: theme.colors.warning, fontFamily: fontFamilies.medium, fontSize: fontSizes.xs, lineHeight: 18 },
  textArea: { minHeight: 116, paddingTop: spacing.md },
  primaryButton: { minHeight: 50, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: borderRadius.md, backgroundColor: theme.colors.primary },
  primaryButtonText: { minWidth: 0, flexShrink: 1, paddingHorizontal: spacing.sm, color: theme.colors.textInverse, fontFamily: fontFamilies.bold, fontSize: fontSizes.md, textAlign: 'center' as const },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.8 },
});
