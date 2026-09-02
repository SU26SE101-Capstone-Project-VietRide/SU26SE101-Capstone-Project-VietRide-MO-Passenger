import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { fontFamilies, fontSizes, spacing } from '@shared/theme';
import type { AppTheme } from '@shared/theme';
import { useThemedStyles } from '@shared/hooks';
import { motionTokens, useMotion } from '@shared/motion';

export interface AnimatedRouteHeaderProps {
  readonly origin: string;
  readonly destination: string;
  readonly secondary?: string;
}

/**
 * Animated booking context that grows with localized and large-font copy.
 * Keeping the animated layer in normal flow prevents fixed-height clipping.
 */
export function AnimatedRouteHeader({
  origin,
  destination,
  secondary,
}: AnimatedRouteHeaderProps): React.JSX.Element {
  const { t } = useTranslation();
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
      <View testID="booking-route-endpoints" style={styles.endpointStack}>
        <View style={styles.endpointRow}>
          <View style={styles.routeBadge} accessible={false}>
            <Text
              testID="booking-route-origin-badge"
              style={styles.routeBadgeText}
              numberOfLines={1}
              accessible={false}
            >
              {t('booking.header.from', { defaultValue: 'Từ' })}
            </Text>
          </View>
          <Text
            testID="booking-route-origin"
            style={styles.primary}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            accessibilityLabel={`${t('booking.header.from', { defaultValue: 'Từ' })} ${origin}`}
          >
            {origin}
          </Text>
          <View style={styles.routeBadgeSpacer} accessible={false} />
        </View>
        <View style={styles.endpointRow}>
          <View style={styles.routeBadge} accessible={false}>
            <Text
              testID="booking-route-destination-badge"
              style={styles.routeBadgeText}
              numberOfLines={1}
              accessible={false}
            >
              {t('booking.header.to', { defaultValue: 'Đến' })}
            </Text>
          </View>
          <Text
            testID="booking-route-destination"
            style={styles.primary}
            numberOfLines={1}
            ellipsizeMode="tail"
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            accessibilityLabel={`${t('booking.header.to', { defaultValue: 'Đến' })} ${destination}`}
          >
            {destination}
          </Text>
          <View style={styles.routeBadgeSpacer} accessible={false} />
        </View>
      </View>
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
  endpointStack: {
    width: '100%',
    minWidth: 0,
    gap: 3,
  },
  endpointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minWidth: 0,
    gap: 5,
  },
  routeBadge: {
    paddingHorizontal: 4,
    minWidth: 32,
    height: 18,
    borderRadius: 4,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  routeBadgeSpacer: {
    paddingHorizontal: 4,
    minWidth: 32,
    height: 18,
    flexShrink: 0,
  },
  routeBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 9.5,
    lineHeight: 12,
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0,
    includeFontPadding: false,
    textAlign: 'center',
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
    flexShrink: 1,
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
