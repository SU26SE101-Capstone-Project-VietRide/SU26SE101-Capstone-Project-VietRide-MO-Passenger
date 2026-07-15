import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '@shared/contexts/ThemeContext';
import type { AppTheme } from '@shared/theme';

type UniversalStyle = ViewStyle & TextStyle & ImageStyle;

// Theme factories live outside StyleSheet.create, so TypeScript widens their
// string literals. Preserve each factory's exact shape while exposing every
// entry as a React Native style at the hook boundary.
type ThemedStyleSheet<T extends Record<string, object>> = {
  [K in keyof T]: T[K] & UniversalStyle;
};

export function useThemedStyles<T extends Record<string, object>>(
  createStyles: (theme: AppTheme) => T,
): ThemedStyleSheet<T> {
  const theme = useTheme();

  return useMemo(
    () => {
      const themedStyles = createStyles(theme);

      return StyleSheet.create(themedStyles as ThemedStyleSheet<T>);
    },
    [createStyles, theme],
  );
}
