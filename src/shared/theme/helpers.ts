import { ViewStyle, TextStyle, Platform } from 'react-native';
import { ThemeVariant, AppTheme } from './types';
import { themes } from './themes';

export const getCardStyle = (theme: AppTheme, baseStyle: any = {}): ViewStyle => {
  return {
    ...baseStyle,
    backgroundColor: theme.cardStyle.backgroundColor,
    borderColor: theme.cardStyle.borderColor,
  };
};

export const getSurfaceStyle = (theme: AppTheme, baseStyle: any = {}): ViewStyle => {
  return {
    ...baseStyle,
    backgroundColor: theme.surfaceStyle.backgroundColor,
    borderColor: theme.surfaceStyle.borderColor,
  };
};

export const getTextStyle = (theme: AppTheme): TextStyle => ({
  color: theme.isDark ? '#FFFFFF' : '#181C20',
});
