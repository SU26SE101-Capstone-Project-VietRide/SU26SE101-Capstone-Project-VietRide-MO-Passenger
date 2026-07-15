/**
 * VectorImage — Renders both raster images (PNG/JPG) and vector graphics (SVG)
 *
 * Automatically delegates to react-native-svg SvgUri for SVG files
 * and standard React Native Image for other images.
 */

import React from 'react';
import { Image } from 'react-native';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useTheme } from '@shared/contexts/ThemeContext';

type VectorDimension = number | `${number}%`;

interface VectorImageProps {
  source: string;
  width?: VectorDimension;
  height?: VectorDimension;
  style?: StyleProp<ImageStyle>;
  color?: string;
}

export function VectorImage({
  source,
  width,
  height,
  style,
  color,
}: VectorImageProps): React.JSX.Element {
  const theme = useTheme();
  const iconColor = color || (theme.isDark ? '#FFFFFF' : '#181C20');

  if (source && source.endsWith('.svg')) {
    return (
      <SvgUri
        uri={source}
        width={width}
        height={height}
        style={style as StyleProp<ViewStyle>}
        color={iconColor}
      />
    );
  }

  return (
    <Image
      source={{ uri: source }}
      style={[{ width, height }, style]}
      resizeMode="contain"
    />
  );
}
