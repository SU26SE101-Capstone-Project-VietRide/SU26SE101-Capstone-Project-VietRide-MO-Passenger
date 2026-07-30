import React from 'react';
import {
  ActivityIndicator,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';

import { APP_LOGO } from '@shared/constants/assets';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { MotionFade } from '@shared/motion';

interface AppLaunchScreenProps {
  message?: string;
}

/**
 * Branded bootstrap screen used only while fonts or the auth session hydrate.
 * Global blocking operations continue to use LoadingOverlay over live content.
 */
export function AppLaunchScreen({
  message,
}: AppLaunchScreenProps): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={styles.screen}
      accessibilityLabel={t('app.loadingLabel')}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <MotionFade style={styles.content}>
        <View style={styles.logoFrame}>
          <Image
            accessibilityLabel={t('app.logoLabel')}
            source={APP_LOGO}
            style={styles.logo}
            contentFit="contain"
            transition={0}
          />
        </View>
        <Text style={styles.tagline} maxFontSizeMultiplier={1.35}>
          {t('app.tagline')}
        </Text>
        <View style={styles.progressRow} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.message} maxFontSizeMultiplier={1.35}>
            {message ?? t('app.preparing')}
          </Text>
        </View>
      </MotionFade>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
    paddingHorizontal: spacing.xxl,
  },
  glowTop: {
    position: 'absolute',
    top: -140,
    right: -110,
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: theme.effects.ambientGlow,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -180,
    left: -150,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: theme.effects.glassTint,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  logoFrame: {
    width: 184,
    height: 184,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    ...theme.components.elevatedCard,
  },
  logo: {
    width: 168,
    height: 168,
  },
  tagline: {
    marginTop: spacing.xxl,
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.5,
    textAlign: 'center',
  },
  progressRow: {
    minHeight: 48,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  message: {
    flexShrink: 1,
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
});
