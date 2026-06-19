import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '@shared/contexts/ThemeContext';
import type { AppTheme } from '@shared/theme';

export function useThemedStyles<T extends Record<string, any>>(
  createStyles: (theme: AppTheme) => T,
): { [K in keyof T]: any } {
  const theme = useTheme();

  return useMemo(
    () => StyleSheet.create(createStyles(theme) as any) as T,
    [createStyles, theme],
  );
}
