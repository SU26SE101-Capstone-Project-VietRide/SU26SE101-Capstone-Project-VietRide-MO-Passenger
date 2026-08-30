import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { VNPAY_LOGO } from '@shared/constants/assets';

export type VnPayLogoSize = 'compact' | 'default';

interface VnPayLogoProps {
  size?: VnPayLogoSize;
}

export const VnPayLogo = memo(function VnPayLogo({
  size = 'default',
}: VnPayLogoProps): React.JSX.Element {
  return (
    <Image
      testID="vnpay-logo"
      source={VNPAY_LOGO}
      style={[styles.logo, styles[size]]}
      contentFit="contain"
      transition={0}
      accessible={false}
    />
  );
});

const styles = StyleSheet.create({
  logo: {
    flexShrink: 0,
    borderRadius: 4,
  },
  compact: {
    width: 20,
    height: 20,
  },
  default: {
    width: 30,
    height: 30,
  },
});
