import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Camera, FolderOpen } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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
}: PhotoChoiceSheetProps): React.JSX.Element => {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable style={styles.choiceSheet} onPress={(event) => event.stopPropagation()}>
        <View style={styles.choiceDragHandle} />
        <View style={styles.choiceHeader}>
          <Text style={styles.choiceTitle}>Add Parcel Photo</Text>
          <Text style={styles.choiceSubtitle}>
            Choose how you want to upload your package photos
          </Text>
        </View>

        <View style={styles.choiceOptionsRow}>
          <Pressable
            style={styles.choiceOptionCard}
            onPress={() => {
              onClose();
              setTimeout(onCamera, 100);
            }}
          >
            <View style={[styles.choiceOptionIconBg, { backgroundColor: theme.colors.primaryFaded }]}>
              <Camera size={28} color={theme.colors.primary} weight="duotone" />
            </View>
            <Text style={styles.choiceOptionTitle}>Use Camera</Text>
            <Text style={styles.choiceOptionDesc}>Take a live photo of the package</Text>
          </Pressable>

          <Pressable
            style={styles.choiceOptionCard}
            onPress={() => {
              onClose();
              setTimeout(onGallery, 100);
            }}
          >
            <View style={[styles.choiceOptionIconBg, { backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt }]}>
              <FolderOpen size={28} color={theme.colors.textSecondary} weight="duotone" />
            </View>
            <Text style={styles.choiceOptionTitle}>From Gallery</Text>
            <Text style={styles.choiceOptionDesc}>Upload from photo library</Text>
          </Pressable>
        </View>

        <Pressable style={styles.choiceCancelButton} onPress={onClose}>
          <Text style={styles.choiceCancelButtonText}>Cancel</Text>
        </Pressable>
      </Pressable>
    </Pressable>
  </Modal>
  );
};

const createStyles = (theme: AppTheme) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.effects.scrim,
    justifyContent: 'flex-end',
  },
  choiceSheet: {
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceStrong : theme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    paddingBottom: Math.max(spacing.xxl, 34),
    ...theme.effects.floatingShadow,
  },
  choiceDragHandle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
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
    color: theme.colors.textPrimary,
    marginBottom: spacing.xs,
  },
  choiceSubtitle: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
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
    color: theme.colors.textPrimary,
  },
  choiceOptionDesc: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  choiceCancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderRadius: borderRadius.md,
    height: 48,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  choiceCancelButtonText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    color: theme.colors.textSecondary,
  },
});
