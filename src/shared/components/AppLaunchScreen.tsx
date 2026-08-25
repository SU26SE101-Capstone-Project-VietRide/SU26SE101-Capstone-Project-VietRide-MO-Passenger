import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { APP_LAUNCH_LOGO } from '@shared/constants/assets';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';
import { useTheme } from '@shared/contexts/ThemeContext';
import { useResponsiveLayout, useThemedStyles } from '@shared/hooks';
import { getAppLaunchLayout } from '@shared/layout/appLaunchLayout';
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
  const { width, height, fontScale } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  const layout = getAppLaunchLayout({
    width,
    height,
    fontScale,
    topInset: insets.top,
    bottomInset: insets.bottom,
  });

  return (
    <View
      style={styles.screen}
      accessibilityLabel={t('app.loadingLabel')}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <View style={styles.decorations} pointerEvents="none">
        <View style={styles.glowTop} />
        <View style={styles.glowBottom} />
      </View>

      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom', 'left', 'right']}
      >
        <ScrollView
          testID="app-launch-scroll"
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingHorizontal: layout.horizontalPadding,
              paddingVertical: layout.verticalPadding,
            },
          ]}
          contentInsetAdjustmentBehavior="never"
          alwaysBounceVertical={false}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <MotionFade
            style={[
              styles.content,
              { maxWidth: layout.contentMaxWidth },
            ]}
          >
            <View
              testID="app-launch-logo-frame"
              style={[
                styles.logoFrame,
                {
                  width: layout.logoFrameSize,
                  height: layout.logoFrameSize,
                },
              ]}
            >
              <Image
                accessibilityLabel={t('app.logoLabel')}
                source={APP_LAUNCH_LOGO}
                style={styles.logo}
                contentFit="contain"
                transition={0}
              />
            </View>
            <Text
              testID="app-launch-tagline"
              style={[
                styles.tagline,
                { marginTop: layout.taglineGap },
              ]}
            >
              {t('app.tagline')}
            </Text>
            <View
              testID="app-launch-progress"
              style={[
                styles.progressRow,
                layout.stackProgress ? styles.progressColumn : null,
                { marginTop: layout.progressGap },
              ]}
              accessibilityRole="progressbar"
            >
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                testID="app-launch-message"
                style={[
                  styles.message,
                  layout.stackProgress ? styles.messageStacked : null,
                ]}
                accessibilityLiveRegion="polite"
              >
                {message ?? t('app.preparing')}
              </Text>
            </View>
          </MotionFade>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  decorations: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
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
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
  },
  logoFrame: {
    ...theme.components.elevatedCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  tagline: {
    width: '100%',
    minWidth: 0,
    color: theme.colors.textPrimary,
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.lg,
    lineHeight: fontSizes.lg * 1.5,
    textAlign: 'center',
  },
  progressRow: {
    width: '100%',
    minWidth: 0,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  progressColumn: {
    flexDirection: 'column',
  },
  message: {
    minWidth: 0,
    maxWidth: '100%',
    flexShrink: 1,
    color: theme.colors.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    textAlign: 'center',
  },
  messageStacked: {
    width: '100%',
  },
});
