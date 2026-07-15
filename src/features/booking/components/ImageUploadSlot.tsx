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
import { Text, Pressable, ViewStyle } from 'react-native';
import { Camera } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

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

export const ImageUploadSlot = memo(function ImageUploadSlotComponent({
  onPress,
  label = 'Add parcel photos',
  helperText = 'Support JPG, PNG up to 5MB',
  compact = false,
  style,
  accessibilityHint,
}: ImageUploadSlotProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      style={[compact ? styles.slotCompact : styles.slot, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint ?? helperText}
    >
      <Camera size={compact ? 24 : 32} color={theme.colors.textTertiary} weight="light" />
      <Text style={compact ? styles.labelCompact : styles.label}>{label}</Text>
      {!compact ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </Pressable>
  );
});

const createStyles = (theme: AppTheme) => ({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    borderStyle: 'dashed',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
    minHeight: 140,
    ...theme.effects.cardShadow,
  },
  slotCompact: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  label: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  labelCompact: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  helper: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
});
