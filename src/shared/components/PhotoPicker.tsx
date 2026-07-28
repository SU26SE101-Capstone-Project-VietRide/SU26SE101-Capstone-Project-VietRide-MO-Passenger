import React, { memo, useCallback, useMemo, useRef } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  Text,
  View,
} from 'react-native';
import { FlashList, type ListRenderItem } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Camera, ImageSquare, Plus, X } from 'phosphor-react-native';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import {
  pickLocalImages,
  type LocalImageAsset,
  type LocalImagePickerSource,
} from '@shared/services/localImagePicker';

export const DEFAULT_MAX_LOCAL_PHOTO_PREVIEWS = 3;
export const HARD_MAX_LOCAL_PHOTO_PREVIEWS = 5;

const PICKER_QUALITY = 0.72;

interface PhotoPreviewProps {
  index: number;
  photoLabel: string;
  uri: string;
  onRemove: (index: number) => void;
}

const PhotoPreview = memo(function PhotoPreviewItem({
  index,
  photoLabel,
  uri,
  onRemove,
}: PhotoPreviewProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const handleRemove = useCallback(() => onRemove(index), [index, onRemove]);

  return (
    <View style={styles.previewCard}>
      <Image
        source={{ uri }}
        recyclingKey={uri}
        contentFit="cover"
        transition={120}
        style={styles.previewImage}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${photoLabel} ${index + 1}`}
        hitSlop={8}
        onPress={handleRemove}
        style={styles.removeButton}
      >
        <X size={14} color={theme.colors.textInverse} weight="bold" />
      </Pressable>
    </View>
  );
});

export interface PhotoPickerProps {
  value: readonly string[];
  onChange: (nextValue: string[]) => void;
  disabled?: boolean;
  helperText?: string;
  maxPhotos?: number;
  photoLabel?: string;
  title?: string;
}

const normalizeMaxPhotos = (maxPhotos: number): number => {
  if (!Number.isFinite(maxPhotos)) {
    return DEFAULT_MAX_LOCAL_PHOTO_PREVIEWS;
  }

  return Math.min(
    HARD_MAX_LOCAL_PHOTO_PREVIEWS,
    Math.max(1, Math.floor(maxPhotos)),
  );
};

const showPermissionDeniedAlert = (
  sourceLabel: string,
  canAskAgain: boolean,
  photoLabel: string,
): void => {
  const buttons = canAskAgain
    ? [{ text: 'OK' }]
    : [
        { text: 'Not now', style: 'cancel' as const },
        {
          text: 'Open settings',
          onPress: () => {
            Linking.openSettings().catch(() => undefined);
          },
        },
      ];

  Alert.alert(
    `${sourceLabel} permission needed`,
    `Allow ${sourceLabel.toLowerCase()} access to add ${photoLabel}s to this request.`,
    buttons,
  );
};

export const PhotoPicker = memo(function PhotoPickerComponent({
  value,
  onChange,
  disabled = false,
  helperText,
  maxPhotos = DEFAULT_MAX_LOCAL_PHOTO_PREVIEWS,
  photoLabel = 'photo',
  title = 'Photos (optional)',
}: PhotoPickerProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const isPickingRef = useRef(false);
  const safeMaxPhotos = normalizeMaxPhotos(maxPhotos);
  const resolvedHelperText = helperText
    ?? `Up to ${safeMaxPhotos} photos. Review your selection before submitting.`;
  const photos = useMemo(() => {
    const uniquePhotos = new Set<string>();

    for (const uri of value) {
      const normalizedUri = uri.trim();
      if (normalizedUri) {
        uniquePhotos.add(normalizedUri);
      }
      if (uniquePhotos.size === safeMaxPhotos) {
        break;
      }
    }

    return Array.from(uniquePhotos);
  }, [safeMaxPhotos, value]);

  const appendAssets = useCallback((assets: readonly LocalImageAsset[]) => {
    const nextPhotos = new Set(photos);

    for (const asset of assets) {
      if (asset.type && asset.type !== 'image') {
        continue;
      }

      const uri = asset.uri.trim();
      if (uri) {
        nextPhotos.add(uri);
      }
      if (nextPhotos.size === safeMaxPhotos) {
        break;
      }
    }

    const nextValue = Array.from(nextPhotos);
    if (nextValue.length !== photos.length) {
      onChange(nextValue);
    }
  }, [onChange, photos, safeMaxPhotos]);

  const runPicker = useCallback(async (
    source: LocalImagePickerSource,
  ): Promise<void> => {
    if (disabled || isPickingRef.current || photos.length >= safeMaxPhotos) {
      return;
    }

    isPickingRef.current = true;
    try {
      const remainingSlots = safeMaxPhotos - photos.length;
      const result = await pickLocalImages({
        source,
        allowsEditing: false,
        quality: PICKER_QUALITY,
        selectionLimit: remainingSlots,
      });

      if (result.status === 'permission-denied') {
        showPermissionDeniedAlert(
          result.source === 'camera' ? 'Camera' : 'Photo library',
          result.canAskAgain,
          photoLabel,
        );
        return;
      }

      if (result.status === 'unavailable') {
        Alert.alert(
          'Camera unavailable',
          'On this Android version, choose an existing photo from the library. The app does not request legacy storage access.',
        );
        return;
      }

      if (result.status === 'selected') {
        appendAssets(result.assets);
      }
    } catch {
      Alert.alert(
        'Unable to add photo',
        'The photo picker could not be opened. Please try again.',
      );
    } finally {
      isPickingRef.current = false;
    }
  }, [appendAssets, disabled, photoLabel, photos.length, safeMaxPhotos]);

  const handleCameraPress = useCallback(() => {
    runPicker('camera').catch(() => undefined);
  }, [runPicker]);

  const handleLibraryPress = useCallback(() => {
    runPicker('library').catch(() => undefined);
  }, [runPicker]);

  const handleAddPress = useCallback(() => {
    if (disabled || photos.length >= safeMaxPhotos) {
      return;
    }

    Alert.alert(
      `Add ${photoLabel}`,
      'Choose a source. Selected photos are added to this request when you submit.',
      [
        { text: 'Camera', onPress: handleCameraPress },
        { text: 'Photo library', onPress: handleLibraryPress },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [disabled, handleCameraPress, handleLibraryPress, photoLabel, photos.length, safeMaxPhotos]);

  const handleRemove = useCallback((index: number) => {
    onChange(photos.filter((_, photoIndex) => photoIndex !== index));
  }, [onChange, photos]);

  const renderPhoto: ListRenderItem<string> = useCallback(({ item, index }) => (
    <PhotoPreview
      index={index}
      photoLabel={photoLabel}
      uri={item}
      onRemove={handleRemove}
    />
  ), [handleRemove, photoLabel]);

  const keyExtractor = useCallback((uri: string) => uri, []);
  const canAddMore = !disabled && photos.length < safeMaxPhotos;

  const addTile = useMemo(() => (
    canAddMore ? (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add another ${photoLabel}`}
        onPress={handleAddPress}
        style={styles.addTile}
      >
        <Plus size={22} color={theme.colors.primary} weight="bold" />
        <Text style={styles.addTileText}>Add</Text>
      </Pressable>
    ) : null
  ), [canAddMore, handleAddPress, photoLabel, styles, theme.colors.primary]);

  return (
    <View style={styles.container}>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.counter}>{photos.length}/{safeMaxPhotos}</Text>
        </View>
        <ImageSquare size={22} color={theme.colors.primary} weight="duotone" />
      </View>

      {photos.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Add ${photoLabel}s`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={handleAddPress}
          style={({ pressed }) => [
            styles.emptyPicker,
            disabled ? styles.disabled : null,
            pressed ? styles.pressed : null,
          ]}
        >
          <Camera size={30} color={theme.colors.primary} weight="duotone" />
          <Text style={styles.emptyTitle}>Take or choose photos</Text>
          <Text style={styles.emptyText}>JPG, PNG, HEIC</Text>
        </Pressable>
      ) : (
        <FlashList
          data={photos}
          horizontal
          keyExtractor={keyExtractor}
          renderItem={renderPhoto}
          ListFooterComponent={addTile}
          showsHorizontalScrollIndicator={false}
          style={styles.previewList}
        />
      )}

      <Text style={styles.helperText}>{resolvedHelperText}</Text>
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  headingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  headingCopy: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
  },
  title: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
  },
  counter: {
    color: theme.colors.textTertiary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
  },
  emptyPicker: {
    minHeight: 120,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xs,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.glassSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
  },
  emptyText: {
    color: theme.colors.textTertiary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
  },
  previewList: {
    height: 88,
  },
  previewCard: {
    width: 80,
    height: 80,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.glassBorder
      : theme.colors.divider,
    backgroundColor: theme.colors.surfaceAlt,
  },
  previewImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  removeButton: {
    position: 'absolute' as const,
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: theme.effects.scrim,
  },
  addTile: {
    width: 80,
    height: 80,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: spacing.xxs,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed' as const,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryFaded,
  },
  addTileText: {
    color: theme.colors.primary,
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
  },
  helperText: {
    color: theme.colors.textTertiary,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: 17,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.99 }],
  },
});
