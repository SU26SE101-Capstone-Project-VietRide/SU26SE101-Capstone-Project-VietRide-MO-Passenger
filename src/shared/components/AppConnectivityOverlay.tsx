import React, { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiSlash } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import { useAppStore } from '@shared/store';
import { showSnackbar } from '@shared/store/useSnackbarStore';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

export function AppConnectivityOverlay(): React.JSX.Element | null {
  const { t } = useTranslation();
  const isOnline = useAppStore(state => state.isOnline);
  const hasHydrated = useAppStore(state => state.hasHydrated);
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const previousOnlineRef = useRef(isOnline);
  const experiencedOfflineRef = useRef(false);

  useEffect(() => {
    const wasOnline = previousOnlineRef.current;

    if (!isOnline) {
      experiencedOfflineRef.current = true;
    } else if (!wasOnline && experiencedOfflineRef.current) {
      showSnackbar({
        message: t('network.reconnected'),
        tone: 'success',
        durationMs: 2400,
      });
    }

    previousOnlineRef.current = isOnline;
  }, [isOnline, t]);

  if (!hasHydrated || isOnline) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.positioner, { top: insets.top + spacing.xs }]}
    >
      <View style={styles.banner}>
        <WifiSlash
          size={17}
          color={theme.colors.warningForeground}
          weight="bold"
        />
        <View style={styles.copy}>
          <Text style={styles.title}>{t('network.offlineTitle')}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {t('network.offlineDescription')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => ({
  positioner: {
    position: 'absolute' as const,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 80,
    alignItems: 'center' as const,
  },
  banner: {
    maxWidth: 520,
    width: '100%' as const,
    minHeight: 48,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: theme.colors.warningLight,
    borderWidth: 1,
    borderColor: theme.effects.contentBorderStrong,
    ...theme.effects.floatingShadow,
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: fontFamilies.semiBold,
    fontSize: fontSizes.xs,
    color: theme.colors.warningForeground,
  },
  description: {
    marginTop: 1,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.xs,
    color: theme.colors.textSecondary,
  },
});
