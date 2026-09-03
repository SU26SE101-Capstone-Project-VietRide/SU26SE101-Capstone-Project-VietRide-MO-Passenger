import React, { memo, useCallback, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import {
  ArrowSquareOut,
  FileText,
  ImageSquare,
  X,
} from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusChip } from '@shared/components';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import type { ParcelClaimEvidence } from '../types';
import {
  getParcelClaimEvidenceDisplayNote,
  getParcelClaimEvidenceTypeLabelKey,
  isParcelClaimEvidenceImage,
  isSafeParcelClaimEvidenceReference,
} from '../utils/parcelClaimEvidence';

interface ParcelClaimEvidenceItemProps {
  acceptedForAppeal: boolean;
  acceptedForClaim: boolean;
  evidence: ParcelClaimEvidence;
}

function ParcelClaimEvidenceItemComponent({
  acceptedForAppeal,
  acceptedForClaim,
  evidence,
}: ParcelClaimEvidenceItemProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [imageFailed, setImageFailed] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const reference = evidence.reference.trim();
  const isSafeReference = useMemo(
    () => isSafeParcelClaimEvidenceReference(reference),
    [reference],
  );
  const isImageReference = useMemo(
    () => isSafeReference && isParcelClaimEvidenceImage(evidence),
    [evidence, isSafeReference],
  );
  const canPreviewImage = isImageReference && !imageFailed;
  const evidenceTypeLabel = t(
    getParcelClaimEvidenceTypeLabelKey(evidence.evidenceType),
  );
  const displayNote = getParcelClaimEvidenceDisplayNote(
    evidence,
    t('parcel.claim.inheritedIncidentEvidenceNote'),
  );

  const closePreview = useCallback(() => setPreviewVisible(false), []);
  const handleImageError = useCallback(() => {
    setImageFailed(true);
    setPreviewVisible(false);
  }, []);

  const showOpenError = useCallback(() => {
    Alert.alert(
      t('parcel.claim.evidenceOpenErrorTitle'),
      t('parcel.claim.evidenceOpenErrorDescription'),
    );
  }, [t]);

  const openReference = useCallback(async () => {
    if (!isSafeReference) {
      showOpenError();
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(reference);
      if (!canOpen) {
        showOpenError();
        return;
      }
      await Linking.openURL(reference);
    } catch {
      showOpenError();
    }
  }, [isSafeReference, reference, showOpenError]);

  const handlePrimaryAction = useCallback(() => {
    if (canPreviewImage) {
      setPreviewVisible(true);
      return;
    }
    openReference().catch(() => undefined);
  }, [canPreviewImage, openReference]);

  return (
    <View
      testID={`parcel-claim-evidence-${evidence.evidenceId}`}
      style={styles.container}
    >
      <Pressable
        testID={`parcel-claim-evidence-preview-${evidence.evidenceId}`}
        accessibilityRole="button"
        accessibilityLabel={t('parcel.claim.evidencePreviewAccessibility', {
          type: evidenceTypeLabel,
        })}
        accessibilityState={{ disabled: !isSafeReference }}
        disabled={!isSafeReference}
        onPress={handlePrimaryAction}
        style={({ pressed }) => [
          styles.thumbnailButton,
          pressed ? styles.pressed : null,
        ]}
      >
        {canPreviewImage ? (
          <Image
            testID={`parcel-claim-evidence-image-${evidence.evidenceId}`}
            source={{ uri: reference }}
            recyclingKey={evidence.evidenceId}
            cachePolicy="memory-disk"
            contentFit="cover"
            onError={handleImageError}
            style={styles.thumbnailImage}
          />
        ) : (
          <View style={styles.documentThumbnail}>
            <FileText size={28} color={theme.colors.primary} weight="duotone" />
          </View>
        )}
      </Pressable>

      <View style={styles.content}>
        <Text style={styles.evidenceType}>{evidenceTypeLabel}</Text>
        <View style={styles.evidenceBadges}>
          {acceptedForClaim ? (
            <StatusChip
              label={t('parcel.claim.acceptedForClaim')}
              tone="success"
            />
          ) : null}
          {acceptedForAppeal ? (
            <StatusChip
              label={t('parcel.claim.acceptedForAppeal')}
              tone="info"
            />
          ) : null}
        </View>
        {displayNote ? (
          <Text style={styles.evidenceNote}>{displayNote}</Text>
        ) : null}

        {isSafeReference ? (
          <Pressable
            testID={`parcel-claim-evidence-open-${evidence.evidenceId}`}
            accessibilityRole="button"
            onPress={handlePrimaryAction}
            style={({ pressed }) => [
              styles.openButton,
              pressed ? styles.pressed : null,
            ]}
          >
            {canPreviewImage ? (
              <ImageSquare size={16} color={theme.colors.primary} />
            ) : (
              <ArrowSquareOut size={16} color={theme.colors.primary} />
            )}
            <Text style={styles.openButtonText}>
              {t(
                canPreviewImage
                  ? 'parcel.claim.viewEvidencePhoto'
                  : 'parcel.claim.openEvidenceDocument',
              )}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.unavailableText}>
            {t('parcel.claim.evidenceReferenceUnavailable')}
          </Text>
        )}
      </View>

      {previewVisible ? (
        <Modal
          visible
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={closePreview}
        >
          <SafeAreaView
            testID={`parcel-claim-evidence-modal-${evidence.evidenceId}`}
            accessibilityViewIsModal
            onAccessibilityEscape={closePreview}
            edges={['top', 'bottom']}
            style={styles.previewRoot}
          >
            <View style={styles.previewHeader}>
              <Text numberOfLines={1} style={styles.previewTitle}>
                {evidenceTypeLabel}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('parcel.claim.closeEvidencePreview')}
                hitSlop={8}
                onPress={closePreview}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed ? styles.previewPressed : null,
                ]}
              >
                <X size={22} color={theme.colors.textInverse} weight="bold" />
              </Pressable>
            </View>
            <Image
              source={{ uri: reference }}
              recyclingKey={`${evidence.evidenceId}-preview`}
              cachePolicy="memory-disk"
              contentFit="contain"
              onError={handleImageError}
              style={styles.previewImage}
            />
            <Pressable
              accessibilityRole="link"
              onPress={() => openReference().catch(() => undefined)}
              style={({ pressed }) => [
                styles.externalButton,
                pressed ? styles.previewPressed : null,
              ]}
            >
              <ArrowSquareOut size={18} color={theme.colors.textInverse} />
              <Text style={styles.externalButtonText}>
                {t('parcel.claim.openEvidenceDocument')}
              </Text>
            </Pressable>
          </SafeAreaView>
        </Modal>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  container: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  thumbnailButton: {
    width: 80,
    height: 80,
    flexShrink: 0,
    overflow: 'hidden' as const,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  thumbnailImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  documentThumbnail: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.colors.primaryFaded,
  },
  content: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start' as const,
    gap: spacing.xs,
  },
  evidenceType: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
  },
  evidenceBadges: {
    minWidth: 0,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: spacing.xs,
  },
  evidenceNote: {
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  openButton: {
    minHeight: 44,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.primaryFaded,
  },
  openButtonText: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
  },
  unavailableText: {
    color: theme.colors.error,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
  pressed: { opacity: 0.78 },
  previewRoot: {
    flex: 1,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: theme.colors.textPrimary,
  },
  previewHeader: {
    minHeight: 56,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
  },
  previewTitle: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderRadius: borderRadius.full,
    backgroundColor: theme.colors.overlayLight,
  },
  previewImage: {
    flex: 1,
    width: '100%' as const,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.overlay,
  },
  externalButton: {
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderCurve: 'continuous' as const,
    backgroundColor: theme.colors.primary,
  },
  externalButtonText: {
    color: theme.colors.textInverse,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
  },
  previewPressed: { opacity: 0.72 },
});

export const ParcelClaimEvidenceItem = memo(ParcelClaimEvidenceItemComponent);
