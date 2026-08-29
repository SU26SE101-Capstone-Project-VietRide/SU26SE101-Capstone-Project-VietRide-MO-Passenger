/**
 * App Providers — Composes all application-level providers
 *
 * Wraps the entire app in:
 * - React Query (server state)
 * - SafeAreaProvider (safe insets)
 * - NavigationContainer (routing)
 * - i18n (already initialized as side-effect import)
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  NavigationContainer,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import { ThemeProvider } from '@shared/contexts/ThemeContext';
import { useTheme } from '@shared/contexts/ThemeContext';
import { StatusBarDynamic } from '@shared/components/StatusBarDynamic';
import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@shared/api/queryClient';
import { RootNavigator } from '@app/navigation/RootNavigator';
import {
  flushPendingNavigationOpens,
  navigationRef,
} from '@app/navigation/navigationRef';
import { AppPreferencesProvider } from './AppPreferencesProvider';
import { MotionProvider } from '@shared/motion';
import { AppLaunchScreen } from '@shared/components';
import { useTranslation } from 'react-i18next';
import { NotificationCoordinator } from './NotificationCoordinator';

interface AppProvidersProps {
  children?: React.ReactNode;
  isAppReady?: boolean;
}

function ThemedNavigation({
  children,
}: AppProvidersProps): React.JSX.Element {
  const theme = useTheme();
  const navigationTheme = React.useMemo<NavigationTheme>(() => {
    const baseTheme = theme.isDark
      ? NavigationDarkTheme
      : NavigationLightTheme;

    return {
      ...baseTheme,
      dark: theme.isDark,
      colors: {
        ...baseTheme.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.surfaceElevated,
        text: theme.colors.textPrimary,
        border: theme.colors.divider,
        notification: theme.colors.error,
      },
    };
  }, [theme]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navigationTheme}
      onReady={flushPendingNavigationOpens}
      onStateChange={flushPendingNavigationOpens}
    >
      <StatusBarDynamic />
      <RootNavigator />
      <NotificationCoordinator />
      {children}
    </NavigationContainer>
  );
}

function AppSurface({
  children,
  isAppReady = true,
}: AppProvidersProps): React.JSX.Element {
  const { t } = useTranslation();

  if (!isAppReady) {
    return <AppLaunchScreen message={t('app.preparing')} />;
  }

  return <ThemedNavigation>{children}</ThemedNavigation>;
}

export function AppProviders({
  children,
  isAppReady = true,
}: AppProvidersProps): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <MotionProvider>
            <AppPreferencesProvider>
              <AppSurface isAppReady={isAppReady}>
                {children}
              </AppSurface>
            </AppPreferencesProvider>
          </MotionProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
