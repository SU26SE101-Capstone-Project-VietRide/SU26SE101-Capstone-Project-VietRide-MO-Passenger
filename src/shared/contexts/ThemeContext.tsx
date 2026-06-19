import React, { createContext, useContext } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { themes } from '../theme';
import type { AppTheme } from '../theme';

const ThemeContext = createContext<AppTheme>(themes.classic);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const currentThemeVariant = useThemeStore((state) => state.currentTheme);
  const theme = themes[currentThemeVariant] || themes.classic;
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
