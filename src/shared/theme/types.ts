import type { ViewStyle } from 'react-native';
import type { colors } from './colors';

export type ThemeVariant = 'classic' | 'liquid_light' | 'liquid_dark';
export type ThemeColors = Record<keyof typeof colors, string>;

export type ThemeEffectTokens = {
  isLiquid: boolean;
  ambientGlow: string;
  glassOverlay: string;
  glassStroke: string;
  glassHighlight: string;
  scrim: string;
  cardShadow: ViewStyle;
  floatingShadow: ViewStyle;
};

export type ThemeComponentTokens = {
  screen: ViewStyle;
  card: ViewStyle;
  elevatedCard: ViewStyle;
  surface: ViewStyle;
  field: ViewStyle;
  subtleField: ViewStyle;
  headerButton: ViewStyle;
  tabBar: ViewStyle;
  activeTab: ViewStyle;
  actionBar: ViewStyle;
  primaryButton: ViewStyle;
  secondaryButton: ViewStyle;
  dangerButton: ViewStyle;
};

export type AppTheme = {
  variant: ThemeVariant;
  name: string;
  isDark: boolean;
  colors: ThemeColors;
  
  // Liquid Glass specific tokens
  glassOverlay: string;
  blurType: 'light' | 'dark' | 'xlight' | 'prominent' | 'regular' | 'chromeMaterial' | 'material' | 'thickMaterial' | 'thinMaterial' | 'ultraThinMaterial';
  blurAmount: number;
  
  cardStyle: ViewStyle;
  surfaceStyle: ViewStyle;
  effects: ThemeEffectTokens;
  components: ThemeComponentTokens;
};
