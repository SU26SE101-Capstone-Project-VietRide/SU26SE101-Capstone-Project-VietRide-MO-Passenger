import React, { memo, useCallback, useState } from 'react';
import { Text, View, type LayoutChangeEvent } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

// High, fixed contrast is intentional: dynamically themed QR modules can
// reduce scanner reliability. Only the code surface remains black-on-white.
const QR_FOREGROUND = '#101828';
const QR_BACKGROUND = '#FFFFFF';
export const MIN_SCANNABLE_CODE_SIZE = 148;
export const MAX_SCANNABLE_CODE_SIZE = 184;

export function getResponsiveScannableCodeSize(availableWidth: number): number {
  if (!Number.isFinite(availableWidth)) {
    return MIN_SCANNABLE_CODE_SIZE;
  }

  return Math.min(
    MAX_SCANNABLE_CODE_SIZE,
    Math.max(MIN_SCANNABLE_CODE_SIZE, Math.floor(availableWidth)),
  );
}

interface ScannableCodeCardProps {
  code: string;
  title: string;
  description?: string;
  size?: number;
}

/** Renders a server-owned operational code exactly as received, without IDs or PII. */
export const ScannableCodeCard = memo(function ScannableCodeCard({
  code,
  title,
  description,
  size,
}: ScannableCodeCardProps): React.JSX.Element {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [availableWidth, setAvailableWidth] = useState(0);
  const resolvedSize = size ?? getResponsiveScannableCodeSize(availableWidth);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setAvailableWidth(event.nativeEvent.layout.width - (spacing.lg * 2));
  }, []);

  return (
    <View
      style={styles.container}
      onLayout={size === undefined ? handleLayout : undefined}
      accessibilityRole="image"
      accessibilityLabel={`${title}. ${code}`}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <View style={styles.qrSurface}>
        <QRCode
          value={code}
          size={resolvedSize}
          color={QR_FOREGROUND}
          backgroundColor={QR_BACKGROUND}
          ecl="M"
          quietZone={12}
        />
      </View>
      <Text selectable style={[styles.code, { color: theme.colors.textPrimary }]}>
        {code}
      </Text>
      {description ? (
        <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
});

const createStyles = (theme: AppTheme) => ({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: theme.effects.isLiquid
      ? theme.effects.contentBorder
      : theme.colors.divider,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: theme.effects.isLiquid
      ? theme.effects.contentSurfaceSoft
      : theme.colors.surfaceAlt,
  },
  title: {
    alignSelf: 'stretch',
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  qrSurface: {
    overflow: 'hidden',
    borderRadius: borderRadius.md,
    borderCurve: 'continuous',
    backgroundColor: QR_BACKGROUND,
  },
  code: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    textAlign: 'center',
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    textAlign: 'center',
  },
});
