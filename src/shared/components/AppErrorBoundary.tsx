import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@shared/contexts/ThemeContext';
import { useThemedStyles } from '@shared/hooks';
import {
  borderRadius,
  fontFamilies,
  fontSizes,
  spacing,
  type AppTheme,
} from '@shared/theme';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  resetKey: number;
}

function AppErrorFallback({ onRetry }: { onRetry: () => void }): React.JSX.Element {
  const { t } = useTranslation();
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View
      style={styles.screen}
      accessibilityRole="alert"
      accessibilityLabel={t('app.errorBoundary.title')}
    >
      <View style={styles.iconFrame}>
        <WarningCircle size={34} color={theme.colors.error} weight="duotone" />
      </View>
      <Text style={styles.title}>{t('app.errorBoundary.title')}</Text>
      <Text style={styles.message}>{t('app.errorBoundary.message')}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('app.errorBoundary.retry')}
        onPress={onRetry}
        style={({ pressed }) => [
          styles.retryButton,
          pressed ? styles.retryButtonPressed : null,
        ]}
      >
        <Text style={styles.retryText}>{t('app.errorBoundary.retry')}</Text>
      </Pressable>
    </View>
  );
}

/**
 * Last-resort UI recovery for render/lifecycle exceptions.
 * API failures should still be handled inline by their feature states; this is
 * intentionally reserved for unexpected React errors that would otherwise
 * leave the passenger on a blank/crashed surface.
 */
export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    hasError: false,
    resetKey: 0,
  };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) {
      console.warn('[AppErrorBoundary] Unexpected render error', error, info.componentStack);
    }
  }

  private handleRetry = (): void => {
    this.setState(current => ({
      hasError: false,
      resetKey: current.resetKey + 1,
    }));
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <AppErrorFallback onRetry={this.handleRetry} />;
    }

    return (
      <React.Fragment key={this.state.resetKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}

const createStyles = (theme: AppTheme) => ({
  screen: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.xxl,
    backgroundColor: theme.colors.background,
  },
  iconFrame: {
    width: 68,
    height: 68,
    borderRadius: borderRadius.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.errorLight,
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.xl,
    lineHeight: 30,
    textAlign: 'center' as const,
    color: theme.colors.textPrimary,
  },
  message: {
    maxWidth: 360,
    marginTop: spacing.sm,
    fontFamily: fontFamilies.regular,
    fontSize: fontSizes.sm,
    lineHeight: 22,
    textAlign: 'center' as const,
    color: theme.colors.textSecondary,
  },
  retryButton: {
    minHeight: 48,
    minWidth: 156,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...theme.components.primaryButton,
    borderRadius: borderRadius.lg,
  },
  retryButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  retryText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.sm,
    color: theme.colors.textInverse,
  },
});
