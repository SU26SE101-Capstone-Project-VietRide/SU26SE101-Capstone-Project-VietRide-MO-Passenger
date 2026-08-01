import React, { createContext, useContext, useEffect } from 'react';
import { Appearance, Platform } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/themes';
import type { AppTheme, ThemeVariant } from '../theme/types';

const FALLBACK_THEME_VARIANT: ThemeVariant = 'liquid_light';
const FALLBACK_THEME = themes[FALLBACK_THEME_VARIANT];

const resolveTheme = (variant?: ThemeVariant): AppTheme =>
  themes[variant ?? FALLBACK_THEME_VARIANT] ?? FALLBACK_THEME;

const ThemeContext = createContext<AppTheme | undefined>(FALLBACK_THEME);

let navigationBarModulePromise:
  | Promise<typeof import('expo-navigation-bar')>
  | null = null;

const syncAndroidNavigationBarStyle = async (isDark: boolean): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  // A JS update can reach a device before its development client/APK has been
  // rebuilt with this native module. Loading it lazily keeps that older binary
  // usable; the next native build will pick it up through Expo autolinking.
  navigationBarModulePromise ??= import('expo-navigation-bar');
  const navigationBar = await navigationBarModulePromise;
  await navigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
};

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const currentThemeVariant = useThemeStore((state) => state.currentTheme);
  const theme = resolveTheme(currentThemeVariant);

  useEffect(() => {
    Appearance.setColorScheme(theme.isDark ? 'dark' : 'light');

    syncAndroidNavigationBarStyle(theme.isDark).catch(() => {
      console.warn(
        '[Theme] Android navigation styling is unavailable in this app build.',
      );
    });
  }, [theme.isDark]);
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): AppTheme => useContext(ThemeContext) ?? FALLBACK_THEME;
