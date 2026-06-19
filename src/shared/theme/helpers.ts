import type { TextStyle, ViewStyle } from 'react-native';
import type { AppTheme } from './types';

export const getCardStyle = (theme: AppTheme, baseStyle: any = {}): ViewStyle => {
  return {
    ...baseStyle,
    ...theme.components.card,
  };
};

export const getSurfaceStyle = (theme: AppTheme, baseStyle: any = {}): ViewStyle => {
  return {
    ...baseStyle,
    ...theme.components.surface,
  };
};

export const getTextStyle = (theme: AppTheme): TextStyle => ({
  color: theme.colors.textPrimary,
});

export const isLiquidTheme = (theme: AppTheme): boolean => theme.effects.isLiquid;
