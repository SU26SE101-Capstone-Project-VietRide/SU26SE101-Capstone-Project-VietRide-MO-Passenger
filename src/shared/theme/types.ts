import type { ViewStyle } from 'react-native';
import type { colors } from './colors';

export type ThemeVariant = 'classic' | 'liquid_light' | 'liquid_dark';

export type AppTheme = {
  variant: ThemeVariant;
  name: string;
  isDark: boolean;
  // Use the existing brand colors, but they could be overridden per theme if needed
  colors: typeof colors;
  
  // Liquid Glass specific tokens
  glassOverlay: string;
  blurType: 'light' | 'dark' | 'xlight' | 'prominent' | 'regular' | 'chromeMaterial' | 'material' | 'thickMaterial' | 'thinMaterial' | 'ultraThinMaterial';
  blurAmount: number;
  
  cardStyle: ViewStyle;
  surfaceStyle: ViewStyle;
};
