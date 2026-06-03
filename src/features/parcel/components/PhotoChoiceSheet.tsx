import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Camera, FolderOpen } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

export interface PhotoChoiceSheetProps {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
}

export const PhotoChoiceSheet = ({
  visible,
  onClose,
  onCamera,
  onGallery,
}: PhotoChoiceSheetProps): React.JSX.Element => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity style={styles.choiceSheet} activeOpacity={1}>
        <View style={styles.choiceDragHandle} />
        <View style={styles.choiceHeader}>
          <Text style={styles.choiceTitle}>Add Parcel Photo</Text>
          <Text style={styles.choiceSubtitle}>
            Choose how you want to upload your package photos
          </Text>
        </View>

        <View style={styles.choiceOptionsRow}>
          <TouchableOpacity
            style={styles.choiceOptionCard}
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              setTimeout(onCamera, 100);
            }}
          >
            <View style={[styles.choiceOptionIconBg, { backgroundColor: colors.primaryFaded }]}>
              <Camera size={28} color={colors.primary} weight="duotone" />
            </View>
            <Text style={styles.choiceOptionTitle}>Use Camera</Text>
            <Text style={styles.choiceOptionDesc}>Take a live photo of the package</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.choiceOptionCard}
            activeOpacity={0.8}
            onPress={() => {
              onClose();
              setTimeout(onGallery, 100);
            }}
          >
            <View style={[styles.choiceOptionIconBg, { backgroundColor: colors.surfaceAlt }]}>
              <FolderOpen size={28} color={colors.textSecondary} weight="duotone" />
            </View>
            <Text style={styles.choiceOptionTitle}>From Gallery</Text>
            <Text style={styles.choiceOptionDesc}>Upload from photo library</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.choiceCancelButton} activeOpacity={0.85} onPress={onClose}>
          <Text style={styles.choiceCancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 28, 32, 0.4)',
    justifyContent: 'flex-end',
  },
  choiceSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingBottom: Math.max(spacing.xxl, 34),
    ...shadows.lg,
  },
  choiceDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  choiceHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  choiceTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  choiceSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  choiceOptionsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  choiceOptionCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.divider,
    gap: spacing.sm,
  },
  choiceOptionIconBg: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  choiceOptionTitle: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textPrimary,
  },
  choiceOptionDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
  choiceCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 48,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  choiceCancelButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
});
