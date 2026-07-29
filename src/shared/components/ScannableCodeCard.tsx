import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { useTheme } from '@shared/contexts/ThemeContext';
import { borderRadius, fontFamilies, fontSizes, spacing } from '@shared/theme';

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
  size = 164,
}: ScannableCodeCardProps): React.JSX.Element {
  const theme = useTheme();

  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel={`${title}. ${code}`}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      <View style={styles.qrSurface}>
        <QRCode
          value={code}
          size={size}
          color="#101828"
          backgroundColor="#FFFFFF"
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderCurve: 'continuous',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
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
