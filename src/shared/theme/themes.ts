import type { ViewStyle } from 'react-native';
import { colors } from './colors';
import { borderRadius, shadows } from './spacing';
import type { AppTheme, ThemeColors, ThemeComponentTokens, ThemeEffectTokens, ThemeVariant } from './types';

const continuous = { borderCurve: 'continuous' } as ViewStyle;

const shadow = (
  boxShadow: string,
  legacy: ViewStyle,
): ViewStyle =>
  ({
    ...legacy,
    boxShadow,
  }) as ViewStyle;

const classicColors: ThemeColors = {
  ...colors,
  primary: '#006A67',
  primaryLight: '#2AC1BC',
  primaryDark: '#004A48',
  primaryFaded: '#EAF8F7',
  accentLight: '#71F7F1',
  accentDark: '#00504d',
  background: '#F7F9FF',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F4F9',
  surfaceElevated: '#FFFFFF',
  textPrimary: '#181C20',
  textSecondary: '#3C4948',
  textTertiary: '#6C7A78',
  border: '#BBC9C8',
  borderFocused: '#006A67',
  divider: '#E5E8EE',
  overlay: 'rgba(24, 28, 32, 0.54)',
  overlayLight: 'rgba(24, 28, 32, 0.25)',
  skeleton: '#EBEBF3',
  skeletonHighlight: '#E0E3E8',
};

const liquidLightColors: ThemeColors = {
  ...colors,
  primary: '#007D78',
  primaryLight: '#33D3CD',
  primaryDark: '#005B57',
  primaryFaded: 'rgba(0, 154, 148, 0.12)',
  accent: '#2AC1BC',
  accentLight: '#80FFF8',
  accentDark: '#006A67',
  background: '#EFF7F8',
  surface: 'rgba(255, 255, 255, 0.62)',
  surfaceAlt: 'rgba(255, 255, 255, 0.38)',
  surfaceElevated: 'rgba(255, 255, 255, 0.76)',
  textPrimary: '#13211F',
  textSecondary: '#435A57',
  textTertiary: '#70817F',
  border: 'rgba(0, 91, 87, 0.16)',
  borderFocused: '#007D78',
  divider: 'rgba(0, 91, 87, 0.10)',
  overlay: 'rgba(19, 33, 31, 0.38)',
  overlayLight: 'rgba(19, 33, 31, 0.16)',
  skeleton: 'rgba(255, 255, 255, 0.56)',
  skeletonHighlight: 'rgba(255, 255, 255, 0.84)',
};

const liquidDarkColors: ThemeColors = {
  ...colors,
  background: '#101616',
  surface: 'rgba(28, 34, 34, 0.76)',
  surfaceAlt: 'rgba(37, 45, 45, 0.72)',
  surfaceElevated: 'rgba(45, 55, 55, 0.86)',
  textPrimary: '#F4FBFA',
  textSecondary: '#C7D7D5',
  textTertiary: 'rgba(199, 215, 213, 0.68)',
  textDisabled: 'rgba(199, 215, 213, 0.42)',
  divider: 'rgba(255, 255, 255, 0.11)',
  border: 'rgba(255, 255, 255, 0.14)',
  borderFocused: '#71F7F1',
  primaryFaded: 'rgba(113, 247, 241, 0.14)',
  overlay: 'rgba(8, 13, 13, 0.64)',
  overlayLight: 'rgba(8, 13, 13, 0.42)',
};

const classicEffects: ThemeEffectTokens = {
  isLiquid: false,
  ambientGlow: 'rgba(42, 193, 188, 0.10)',
  glassOverlay: 'rgba(24, 28, 32, 0.54)',
  glassStroke: colors.divider,
  glassHighlight: colors.surface,
  scrim: colors.overlay,
  cardShadow: shadows.sm,
  floatingShadow: shadows.lg,
};

const liquidLightEffects: ThemeEffectTokens = {
  isLiquid: true,
  ambientGlow: 'rgba(42, 193, 188, 0.24)',
  glassOverlay: 'rgba(255, 255, 255, 0.46)',
  glassStroke: 'rgba(255, 255, 255, 0.78)',
  glassHighlight: 'rgba(255, 255, 255, 0.9)',
  scrim: 'rgba(19, 33, 31, 0.32)',
  cardShadow: shadow('0 4px 16px rgba(0, 74, 72, 0.04)', {
    shadowColor: '#004A48',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 0,
  }),
  floatingShadow: shadow('0 14px 30px rgba(0, 106, 103, 0.12)', {
    shadowColor: '#006A67',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 22,
    elevation: 6,
  }),
};

const liquidDarkEffects: ThemeEffectTokens = {
  isLiquid: true,
  ambientGlow: 'rgba(42, 193, 188, 0.18)',
  glassOverlay: 'rgba(22, 28, 28, 0.7)',
  glassStroke: 'rgba(255, 255, 255, 0.14)',
  glassHighlight: 'rgba(255, 255, 255, 0.18)',
  scrim: 'rgba(8, 13, 13, 0.72)',
  cardShadow: shadow('0 18px 42px rgba(0, 0, 0, 0.32)', {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 30,
    elevation: 8,
  }),
  floatingShadow: shadow('0 18px 42px rgba(0, 0, 0, 0.42)', {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.42,
    shadowRadius: 30,
    elevation: 10,
  }),
};

const makeComponents = (
  palette: ThemeColors,
  effects: ThemeEffectTokens,
): ThemeComponentTokens => ({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  card: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: effects.isLiquid ? 'rgba(255, 255, 255, 0.68)' : palette.divider,
    borderRadius: borderRadius.xl,
    ...continuous,
    ...effects.cardShadow,
  },
  elevatedCard: {
    backgroundColor: palette.surfaceElevated,
    borderWidth: 1,
    borderColor: effects.isLiquid ? 'rgba(255, 255, 255, 0.78)' : palette.divider,
    borderRadius: borderRadius.xl,
    ...continuous,
    ...effects.floatingShadow,
  },
  surface: {
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1,
    borderColor: effects.isLiquid ? effects.glassStroke : palette.divider,
    borderRadius: borderRadius.lg,
    ...continuous,
  },
  field: {
    backgroundColor: palette.surfaceAlt,
    borderWidth: 1.2,
    borderColor: palette.divider,
    borderRadius: borderRadius.lg,
    ...continuous,
  },
  subtleField: {
    backgroundColor: palette.primaryFaded,
    borderWidth: 1,
    borderColor: effects.isLiquid ? 'rgba(42, 193, 188, 0.16)' : palette.divider,
    borderRadius: borderRadius.lg,
    ...continuous,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: effects.isLiquid ? effects.glassOverlay : palette.surfaceAlt,
    borderWidth: effects.isLiquid ? 1 : 0,
    borderColor: effects.glassStroke,
    alignItems: 'center',
    justifyContent: 'center',
    ...continuous,
  },
  tabBar: {
    backgroundColor: effects.isLiquid ? 'rgba(255, 255, 255, 0.82)' : palette.surface,
    borderTopWidth: 1,
    borderTopColor: effects.isLiquid ? effects.glassStroke : palette.divider,
    ...effects.floatingShadow,
  },
  activeTab: {
    backgroundColor: effects.isLiquid ? 'rgba(0, 154, 148, 0.12)' : palette.primaryFaded,
    borderWidth: 1,
    borderColor: effects.isLiquid ? 'rgba(255, 255, 255, 0.62)' : palette.primaryFaded,
    ...continuous,
  },
  actionBar: {
    backgroundColor: effects.isLiquid ? palette.surfaceElevated : palette.surface,
    borderTopWidth: 1,
    borderTopColor: effects.isLiquid ? effects.glassStroke : palette.divider,
    ...effects.floatingShadow,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderWidth: 1,
    borderColor: effects.isLiquid ? 'rgba(255, 255, 255, 0.32)' : palette.primary,
    borderRadius: borderRadius.lg,
    ...continuous,
    ...effects.floatingShadow,
  },
  secondaryButton: {
    backgroundColor: palette.primaryFaded,
    borderWidth: 1,
    borderColor: effects.isLiquid ? 'rgba(42, 193, 188, 0.16)' : palette.primaryFaded,
    borderRadius: borderRadius.lg,
    ...continuous,
  },
  dangerButton: {
    backgroundColor: effects.isLiquid ? 'rgba(255, 255, 255, 0.72)' : palette.surface,
    borderWidth: 1.5,
    borderColor: palette.error,
    borderRadius: borderRadius.lg,
    ...continuous,
  },
});

const createTheme = (
  variant: ThemeVariant,
  name: string,
  isDark: boolean,
  palette: ThemeColors,
  effects: ThemeEffectTokens,
  blurType: AppTheme['blurType'],
  blurAmount: number,
): AppTheme => {
  const components = makeComponents(palette, effects);

  return {
    variant,
    name,
    isDark,
    colors: palette,
    glassOverlay: effects.glassOverlay,
    blurType,
    blurAmount,
    cardStyle: components.card,
    surfaceStyle: components.surface,
    effects,
    components,
  };
};

export const themes: Record<ThemeVariant, AppTheme> = {
  classic: createTheme('classic', 'Classic', false, classicColors, classicEffects, 'light', 10),
  liquid_light: createTheme(
    'liquid_light',
    'Liquid Glass Light',
    false,
    liquidLightColors,
    liquidLightEffects,
    'thickMaterial',
    28,
  ),
  liquid_dark: createTheme(
    'liquid_dark',
    'Liquid Glass Dark',
    true,
    liquidDarkColors,
    liquidDarkEffects,
    'thickMaterial',
    28,
  ),
};
