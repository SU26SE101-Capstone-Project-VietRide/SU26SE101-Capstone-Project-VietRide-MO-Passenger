import React, { memo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { fontFamilies, fontSizes } from '@shared/theme';

const SINGLE_DIGIT_MIN_WIDTH = 18;
const DOUBLE_DIGIT_MIN_WIDTH = 24;
const CAPPED_COUNT_MIN_WIDTH = 30;

export interface NotificationBadgePresentation {
  count: number;
  label: string;
  minWidth: number;
}

export const getNotificationBadgePresentation = (
  count: number,
): NotificationBadgePresentation | null => {
  const normalizedCount = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0;

  if (normalizedCount === 0) return null;

  if (normalizedCount > 99) {
    return {
      count: normalizedCount,
      label: '99+',
      minWidth: CAPPED_COUNT_MIN_WIDTH,
    };
  }

  return {
    count: normalizedCount,
    label: String(normalizedCount),
    minWidth: normalizedCount >= 10
      ? DOUBLE_DIGIT_MIN_WIDTH
      : SINGLE_DIGIT_MIN_WIDTH,
  };
};

export interface NotificationCountBadgeProps {
  backgroundColor: string;
  borderColor: string;
  count: number;
  style?: StyleProp<ViewStyle>;
}

export const NotificationCountBadge = memo(function NotificationCountBadgeComponent({
  backgroundColor,
  borderColor,
  count,
  style,
}: NotificationCountBadgeProps): React.JSX.Element | null {
  const presentation = getNotificationBadgePresentation(count);
  if (!presentation) return null;

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.badge,
        {
          backgroundColor,
          borderColor,
          minWidth: presentation.minWidth,
        },
        style,
      ]}
    >
      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={styles.text}
      >
        {presentation.label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  text: {
    color: '#FFFFFF',
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xs,
    lineHeight: 12,
    letterSpacing: -0.2,
    includeFontPadding: false,
    textAlign: 'center',
    flexShrink: 0,
  },
});
