import React, { createContext, useContext } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme/themes';
import type { AppTheme, ThemeVariant } from '../theme/types';

const FALLBACK_THEME_VARIANT: ThemeVariant = 'liquid_light';
const FALLBACK_THEME = themes[FALLBACK_THEME_VARIANT];

const resolveTheme = (variant?: ThemeVariant): AppTheme =>
  themes[variant ?? FALLBACK_THEME_VARIANT] ?? FALLBACK_THEME;

const ThemeContext = createContext<AppTheme | undefined>(FALLBACK_THEME);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const currentThemeVariant = useThemeStore((state) => state.currentTheme);
  const theme = resolveTheme(currentThemeVariant);
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): AppTheme => useContext(ThemeContext) ?? FALLBACK_THEME;
