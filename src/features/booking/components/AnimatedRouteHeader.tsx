import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import { motionTokens, useMotion } from '@shared/motion';

export interface AnimatedRouteHeaderProps {
  readonly primary: string;
  readonly secondary?: string;
}

/**
 * Animated booking context that grows with localized and large-font copy.
 * Keeping the animated layer in normal flow prevents fixed-height clipping.
 */
export function AnimatedRouteHeader({
  primary,
  secondary,
}: AnimatedRouteHeaderProps): React.JSX.Element {
  const styles = useThemedStyles(createStyles);
  const { reduceMotion } = useMotion();
  const progress = useSharedValue(1);
  const [visibleSecondary, setVisibleSecondary] = useState<string | undefined>(secondary);

  useEffect(() => {
    setVisibleSecondary(secondary);
    if (reduceMotion) {
      progress.value = 1;
      return;
    }

    progress.value = 0;
    progress.value = withTiming(1, {
      duration: motionTokens.duration.emphasis,
      easing: Easing.out(Easing.quad),
    });
  }, [progress, reduceMotion, secondary]);

  const incomingStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{
      translateY: (1 - progress.value) * motionTokens.distance.standard,
    }],
  }));

  return (
    <View style={styles.root}>
      <Text
        testID="booking-route-primary"
        style={styles.primary}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {primary}
      </Text>
      <View testID="booking-route-secondary-shell" style={styles.secondaryShell}>
        <Animated.View style={[styles.layer, incomingStyle]}>
          {visibleSecondary ? (
            <Text
              testID="booking-route-secondary"
              style={styles.secondary}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {visibleSecondary}
            </Text>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  root: {
    width: '100%',
    minWidth: 0,
    minHeight: 64,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryShell: {
    width: '100%',
    minWidth: 0,
    minHeight: 22,
    marginTop: spacing.xs,
  },
  layer: {
    width: '100%',
    minWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primary: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.3,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    maxWidth: '100%',
  },
  secondary: {
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.xs,
    lineHeight: 20,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    maxWidth: '100%',
  },
});
