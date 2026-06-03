import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Camera, X } from 'phosphor-react-native';
import { colors, fontFamilies, fontSizes, spacing, borderRadius, shadows } from '@shared/theme';

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
  return (
    <View style={styles.photoContainer}>
      {photos.length === 0 ? (
        <TouchableOpacity style={styles.photoUploadBox} onPress={onAdd} activeOpacity={0.7}>
          <Camera size={32} color={colors.textTertiary} weight="light" />
          <Text style={styles.uploadMainText}>Add parcel photos</Text>
          <Text style={styles.uploadSubText}>Support JPG, PNG up to 5MB</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.photoGrid}>
          {photos.map((uri, idx) => (
            <View key={`photo-${idx}`} style={styles.thumbnailWrapper}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity
                style={styles.removePhotoBadge}
                onPress={() => onRemove(idx)}
                activeOpacity={0.7}
              >
                <X size={10} color={colors.textInverse} weight="bold" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.photoUploadBox, styles.photoUploadBoxThumbnail]}
            onPress={onAdd}
            activeOpacity={0.7}
          >
            <Camera size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  photoContainer: {
    marginTop: spacing.lg,
  },
  photoUploadBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderRadius: borderRadius.lg,
    borderStyle: 'dashed',
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  uploadMainText: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.md,
    color: colors.textPrimary,
  },
  uploadSubText: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: colors.textTertiary,
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
    borderColor: colors.divider,
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoUploadBoxThumbnail: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.divider,
    borderStyle: 'dashed',
    backgroundColor: colors.surfaceAlt,
  },
});
