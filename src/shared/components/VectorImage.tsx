/**
 * VectorImage — Renders both raster images (PNG/JPG) and vector graphics (SVG)
 *
 * Automatically delegates to react-native-svg SvgUri for SVG files
 * and standard React Native Image for other images.
 */

import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { SvgUri } from 'react-native-svg';

interface VectorImageProps {
  source: string;
  width?: number | string;
  height?: number | string;
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
  if (source && source.endsWith('.svg')) {
    return (
      <SvgUri
        uri={source}
        width={width}
        height={height}
        style={style as any}
        color={color}
      />
    );
  }

  return (
    <Image
      source={{ uri: source }}
      style={[{ width: width as any, height: height as any }, style]}
      resizeMode="contain"
    />
  );
}
