import React, { memo } from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { Camera, X } from 'phosphor-react-native';
import { fontFamilies, fontSizes, spacing, borderRadius } from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import type { AppTheme } from '@shared/theme';

export interface PhotoUploadSectionProps {
  photos: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export const PhotoUploadSection = memo(function PhotoUploadSection({
  photos,
  onAdd,
  onRemove,
}: PhotoUploadSectionProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.photoContainer}>
      {photos.length === 0 ? (
        <Pressable style={({ pressed }) => [styles.photoUploadBox, pressed ? styles.pressed : null]} onPress={onAdd}>
          <Camera size={32} color={theme.colors.textTertiary} weight="light" />
          <Text style={styles.uploadMainText}>Add parcel photos</Text>
          <Text style={styles.uploadSubText}>Support JPG, PNG up to 5MB</Text>
        </Pressable>
      ) : (
        <View style={styles.photoGrid}>
          {photos.map((uri, idx) => (
            <View key={`photo-${idx}`} style={styles.thumbnailWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <Pressable
                style={styles.removePhotoBadge}
                onPress={() => onRemove(idx)}
              >
                <X size={10} color={theme.colors.textInverse} weight="bold" />
              </Pressable>
            </View>
          ))}
          <Pressable
            style={[styles.photoUploadBox, styles.photoUploadBoxThumbnail]}
            onPress={onAdd}
          >
            <Camera size={24} color={theme.colors.textTertiary} />
          </Pressable>
        </View>
      )}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  photoContainer: {
    marginTop: spacing.lg,
  },
  photoUploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  uploadMainText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: theme.colors.textPrimary,
  },
  uploadSubText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textTertiary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  removePhotoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.effects.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadBoxThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.effects.isLiquid ? theme.effects.glassBorder : theme.colors.divider,
    borderStyle: 'dashed',
    backgroundColor: theme.effects.isLiquid ? theme.effects.glassSurfaceSoft : theme.colors.surfaceAlt,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
});
