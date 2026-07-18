import React from 'react';
import {
  ActivityIndicator,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { APP_LOGO } from '@shared/constants/assets';
import { colors, spacing } from '@shared/theme';

interface AppLaunchScreenProps {
  message?: string;
}

/**
 * Branded bootstrap screen used only while fonts or the auth session hydrate.
 * Global blocking operations continue to use LoadingOverlay over live content.
 */
export function AppLaunchScreen({
  message = 'Đang khởi động VietRide...',
}: AppLaunchScreenProps): React.JSX.Element {
  return (
    <View style={styles.screen} accessibilityLabel="VietRide loading screen">
      <StatusBar barStyle="dark-content" backgroundColor={BRAND_BACKGROUND} />
      <View style={styles.glowTop} pointerEvents="none" />
      <View style={styles.glowBottom} pointerEvents="none" />

      <View style={styles.content}>
        <View style={styles.logoFrame}>
          <Image
            accessibilityLabel="VietRide logo"
            source={APP_LOGO}
            defaultSource={APP_LOGO}
            fadeDuration={0}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.tagline} maxFontSizeMultiplier={1.35}>
          Đi lại dễ dàng, an tâm mỗi chuyến
        </Text>
        <View style={styles.progressRow} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.message} maxFontSizeMultiplier={1.35}>
            {message}
          </Text>
        </View>
      </View>
    </View>
  );
}

const BRAND_BACKGROUND = '#EFF7F8';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: BRAND_BACKGROUND,
    paddingHorizontal: spacing.xxl,
  },
  glowTop: {
    position: 'absolute',
    top: -140,
    right: -110,
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: 'rgba(42, 193, 188, 0.12)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -180,
    left: -150,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(0, 125, 120, 0.08)',
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
    borderRadius: 92,
    backgroundColor: 'rgba(255, 255, 255, 0.76)',
    shadowColor: '#005653',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
  logo: {
    width: 168,
    height: 168,
  },
  tagline: {
    marginTop: spacing.xxl,
    color: colors.textPrimary,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
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
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
});
