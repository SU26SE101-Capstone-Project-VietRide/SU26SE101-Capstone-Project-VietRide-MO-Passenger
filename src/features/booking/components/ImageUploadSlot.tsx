/**
 * ImageUploadSlot — Dashed-border empty container for future image upload
 *
 * DESIGN.md alignment:
 *  - Input Fields: "Clean, white surfaces with an 8px offset shadow.
 *    On focus, the border-color transitions to the Primary Mint."
 *
 * Visually mirrors the parcel PhotoUploadSection dashed style so the
 * two flows feel consistent. The component is intentionally stateless
 * — it accepts an onPress callback and acts as a slot; the actual
 * camera/gallery picker can be wired up later.
 *
 * Parcel flow uses: PhotoUploadSection (stateful, with thumbs).
 * Booking flow uses: ImageUploadSlot (empty placeholder) until image
 * upload is implemented end-to-end.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Camera } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

interface ImageUploadSlotProps {
  /** Called when the user taps the empty slot. */
  onPress?: () => void;
  /** Optional label overriding the default "Add parcel photos". */
  label?: string;
  /** Optional helper text below the label. */
  helperText?: string;
  /** If true, shows the slot in a compact thumbnail size. */
  compact?: boolean;
  /** Additional style on the outer container. */
  style?: ViewStyle;
  /** Accessibility hint. */
  accessibilityHint?: string;
}

export const ImageUploadSlot = memo(function ImageUploadSlot({
  onPress,
  label = 'Add parcel photos',
  helperText = 'Support JPG, PNG up to 5MB',
  compact = false,
  style,
  accessibilityHint,
}: ImageUploadSlotProps): React.JSX.Element {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[compact ? styles.slotCompact : styles.slot, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint ?? helperText}
    >
      <Camera size={compact ? 24 : 32} color={colors.textTertiary} weight="light" />
      <Text style={compact ? styles.labelCompact : styles.label}>{label}</Text>
      {!compact && (
        <Text style={styles.helper}>{helperText}</Text>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
    minHeight: 140,
    ...shadows.sm,
  },
  slotCompact: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  labelCompact: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  helper: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
