import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { StatusChip } from '@shared/components';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { formatVnd } from '@shared/utils/format';
import type { ParcelClaimProofStatus } from '../types';
import { getParcelClaimProofPresentation } from '../utils/parcelPresentation';

interface ParcelProofAssessmentProps {
  proofStatus: ParcelClaimProofStatus | null;
  decisionRecorded: boolean;
  provenDirectLossVnd: number | null;
  acceptedEvidenceCount: number;
  testID: string;
}

export const ParcelProofAssessment = memo(
  function ParcelProofAssessmentComponent({
    proofStatus,
    decisionRecorded,
    provenDirectLossVnd,
    acceptedEvidenceCount,
    testID,
  }: ParcelProofAssessmentProps): React.JSX.Element {
    const { t } = useTranslation();
    const styles = useThemedStyles(createStyles);
    const presentation = getParcelClaimProofPresentation(
      proofStatus,
      decisionRecorded,
    );
    const isVerified = proofStatus?.trim().toUpperCase() === 'VERIFIED';

    return (
      <View testID={testID} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('parcel.claim.proofTitle')}</Text>
          <StatusChip
            label={t(presentation.labelKey)}
            tone={presentation.tone}
          />
        </View>
        <Text style={styles.description}>
          {t(presentation.descriptionKey)}
        </Text>
        {isVerified && provenDirectLossVnd !== null ? (
          <View style={styles.valueRow}>
            <Text style={styles.valueLabel}>
              {t('parcel.claim.provenDirectLoss')}
            </Text>
            <Text style={styles.value}>{formatVnd(provenDirectLossVnd)}</Text>
          </View>
        ) : null}
        {acceptedEvidenceCount > 0 ? (
          <Text style={styles.acceptedEvidence}>
            {t('parcel.claim.acceptedEvidenceCount', {
              count: acceptedEvidenceCount,
            })}
          </Text>
        ) : null}
      </View>
    );
  },
);

const createStyles = (theme: AppTheme) => ({
  container: {
    ...theme.components.surface,
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
  },
  header: {
    minWidth: 0,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    minWidth: 140,
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
  },
  description: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  valueRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: spacing.md,
    paddingTop: spacing.xs,
  },
  valueLabel: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
  },
  value: {
    minWidth: 0,
    flexShrink: 1,
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    textAlign: 'right' as const,
  },
  acceptedEvidence: {
    color: theme.colors.success,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
});
