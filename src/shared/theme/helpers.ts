import type { TextStyle, ViewStyle } from 'react-native';
import type { AppTheme } from './types';

export const getCardStyle = (theme: AppTheme, baseStyle: ViewStyle = {}): ViewStyle => {
  return {
    ...theme.components.card,
    ...baseStyle,
  };
};

export const getSurfaceStyle = (theme: AppTheme, baseStyle: ViewStyle = {}): ViewStyle => {
  return {
    ...theme.components.surface,
    ...baseStyle,
  };
};

export const getTextStyle = (theme: AppTheme): TextStyle => ({
  color: theme.colors.textPrimary,
});

export const isLiquidTheme = (theme: AppTheme): boolean => theme.effects.isLiquid;
