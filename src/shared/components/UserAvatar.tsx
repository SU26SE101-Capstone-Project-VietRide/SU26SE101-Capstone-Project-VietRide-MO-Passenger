import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type ImageStyle, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '@shared/contexts/ThemeContext';
import { fontFamilies } from '@shared/theme';

export interface UserAvatarProps {
  url?: string | null;
  name?: string | null;
  size?: number;
}

const getInitials = (name?: string | null): string => {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return `${words[0].slice(0, 1)}${words.at(-1)?.slice(0, 1) ?? ''}`.toUpperCase();
};

export const UserAvatar = memo(function UserAvatar({
  url,
  name,
  size = 48,
}: UserAvatarProps): React.JSX.Element {
  const theme = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const hasRemoteImage = Boolean(url && url !== failedUrl);
  const initials = useMemo(() => getInitials(name), [name]);
  const containerStyle = useMemo<ViewStyle>(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: theme.colors.surfaceAlt,
    }),
    [size, theme.colors.surfaceAlt],
  );
  const textStyle = useMemo(
    () => [styles.initials, { fontSize: size * 0.4, color: theme.colors.primary }],
    [size, theme.colors.primary],
  );
  const imageStyle = useMemo<ImageStyle>(() => ({ borderRadius: size / 2 }), [size]);

  useEffect(() => {
    setFailedUrl(null);
  }, [url]);

  return (
    <View style={[styles.container, containerStyle]}>
      {hasRemoteImage ? (
        <Image
          source={url}
          style={[styles.image, imageStyle]}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={url ?? undefined}
          transition={120}
          onError={() => setFailedUrl(url ?? null)}
        />
      ) : (
        <Text style={textStyle}>{initials}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  initials: {
    fontFamily: fontFamilies.bold,
  },
});
