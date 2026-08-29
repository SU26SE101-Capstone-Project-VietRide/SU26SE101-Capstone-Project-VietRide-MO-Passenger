import type { ViewStyle } from 'react-native';
import { colors } from './colors';
import { borderRadius } from './spacing';
import type {
  AppTheme,
  ThemeAccentTokens,
  ThemeColors,
  ThemeComponentTokens,
  ThemeEffectTokens,
  ThemeVariant,
} from './types';

const continuous = { borderCurve: 'continuous' } as ViewStyle;

// Content cards do not mount a native blur view. These semantic surfaces stay
// opaque so nested content cannot create white/grey alpha bands on Android;
// true glass tokens remain available for floating chrome and overlays.
const LIGHT_CONTENT_SURFACE = '#F9FCFC';
const LIGHT_CONTENT_SURFACE_SOFT = '#F3F8F8';
const DARK_CONTENT_SURFACE = '#102423';
const DARK_CONTENT_SURFACE_SOFT = '#172E2C';

const shadow = (
  boxShadow: string,
  legacy: ViewStyle,
): ViewStyle =>
  ({
    ...legacy,
    boxShadow,
  }) as ViewStyle;

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
  primary: '#55F1E8',
  primaryLight: '#9FFFF8',
  primaryDark: '#BFFFFB',
  primaryFaded: 'rgba(85, 241, 232, 0.13)',
  accent: '#55F1E8',
  accentLight: '#BFFFFB',
  accentDark: '#21BDB5',
  background: '#061313',
  surface: 'rgba(17, 31, 31, 0.66)',
  surfaceAlt: 'rgba(255, 255, 255, 0.07)',
  surfaceElevated: 'rgba(20, 38, 38, 0.82)',
  textPrimary: '#F4FFFD',
  textSecondary: '#BFD7D3',
  textTertiary: 'rgba(191, 215, 211, 0.66)',
  textInverse: '#031312',
  textDisabled: 'rgba(191, 215, 211, 0.38)',
  successLight: 'rgba(85, 241, 232, 0.15)',
  warningForeground: '#FFE177',
  warningLight: 'rgba(255, 224, 118, 0.18)',
  errorLight: 'rgba(255, 116, 116, 0.16)',
  infoLight: 'rgba(85, 241, 232, 0.12)',
  divider: 'rgba(255, 255, 255, 0.09)',
  border: 'rgba(174, 255, 249, 0.14)',
  borderFocused: '#9FFFF8',
  overlay: 'rgba(3, 10, 10, 0.72)',
  overlayLight: 'rgba(3, 10, 10, 0.48)',
  skeleton: 'rgba(255, 255, 255, 0.08)',
  skeletonHighlight: 'rgba(255, 255, 255, 0.16)',
};

const liquidLightAccents: ThemeAccentTokens = {
  ticket: {
    foreground: '#007D78',
    soft: 'rgba(0, 125, 120, 0.08)',
    border: 'rgba(0, 125, 120, 0.18)',
    strong: '#007D78',
    onStrong: '#FFFFFF',
  },
  parcel: {
    foreground: '#147A68',
    soft: 'rgba(20, 122, 104, 0.08)',
    border: 'rgba(20, 122, 104, 0.18)',
    strong: '#007D78',
    onStrong: '#FFFFFF',
  },
  promotion: {
    foreground: '#8A6500',
    soft: 'rgba(235, 195, 0, 0.10)',
    border: 'rgba(138, 101, 0, 0.18)',
    strong: '#007D78',
    onStrong: '#FFFFFF',
  },
  finance: {
    foreground: '#176F8F',
    soft: 'rgba(23, 111, 143, 0.08)',
    border: 'rgba(23, 111, 143, 0.18)',
    strong: '#007D78',
    onStrong: '#FFFFFF',
  },
  assistant: {
    foreground: '#087A86',
    soft: 'rgba(8, 122, 134, 0.08)',
    border: 'rgba(8, 122, 134, 0.18)',
    strong: '#007D78',
    onStrong: '#FFFFFF',
  },
  tracking: {
    foreground: '#1677A6',
    soft: 'rgba(22, 119, 166, 0.08)',
    border: 'rgba(22, 119, 166, 0.18)',
    strong: '#007D78',
    onStrong: '#FFFFFF',
  },
};

const liquidDarkAccents: ThemeAccentTokens = {
  ticket: {
    foreground: '#55F1E8',
    soft: 'rgba(85, 241, 232, 0.12)',
    border: 'rgba(85, 241, 232, 0.24)',
    strong: '#55F1E8',
    onStrong: '#031312',
  },
  parcel: {
    foreground: '#72E4C7',
    soft: 'rgba(66, 200, 166, 0.12)',
    border: 'rgba(114, 228, 199, 0.24)',
    strong: '#55F1E8',
    onStrong: '#031312',
  },
  promotion: {
    foreground: '#FFE177',
    soft: 'rgba(235, 195, 0, 0.12)',
    border: 'rgba(255, 225, 119, 0.24)',
    strong: '#55F1E8',
    onStrong: '#031312',
  },
  finance: {
    foreground: '#74C7E5',
    soft: 'rgba(70, 170, 205, 0.12)',
    border: 'rgba(116, 199, 229, 0.24)',
    strong: '#55F1E8',
    onStrong: '#031312',
  },
  assistant: {
    foreground: '#6ED8DB',
    soft: 'rgba(60, 190, 196, 0.12)',
    border: 'rgba(110, 216, 219, 0.24)',
    strong: '#55F1E8',
    onStrong: '#031312',
  },
  tracking: {
    foreground: '#79CFFF',
    soft: 'rgba(65, 170, 220, 0.12)',
    border: 'rgba(121, 207, 255, 0.24)',
    strong: '#55F1E8',
    onStrong: '#031312',
  },
};

const liquidLightEffects: ThemeEffectTokens = {
  isLiquid: true,
  ambientGlow: 'rgba(42, 193, 188, 0.24)',
  glassOverlay: 'rgba(255, 255, 255, 0.46)',
  glassStroke: 'rgba(255, 255, 255, 0.78)',
  glassHighlight: 'rgba(255, 255, 255, 0.9)',
  glassSurface: 'rgba(255, 255, 255, 0.54)',
  glassSurfaceSoft: 'rgba(255, 255, 255, 0.24)',
  glassSurfaceStrong: 'rgba(252, 255, 255, 0.88)',
  glassBorder: 'rgba(255, 255, 255, 0.72)',
  glassBorderStrong: 'rgba(255, 255, 255, 0.9)',
  glassSheen: 'rgba(255, 255, 255, 0.34)',
  glassTint: 'rgba(234, 255, 253, 0.18)',
  contentSurface: LIGHT_CONTENT_SURFACE,
  contentSurfaceSoft: LIGHT_CONTENT_SURFACE_SOFT,
  contentSurfaceElevated: '#FFFFFF',
  contentBorder: 'rgba(0, 91, 87, 0.10)',
  contentBorderStrong: 'rgba(0, 91, 87, 0.16)',
  onPrimarySurface: 'rgba(255, 255, 255, 0.14)',
  onPrimaryBorder: 'rgba(255, 255, 255, 0.22)',
  fieldSurface: 'rgba(252, 255, 255, 0.72)',
  fieldBorder: 'rgba(0, 91, 87, 0.12)',
  tabBarSurface: 'rgba(255, 255, 255, 0.96)',
  tabActiveSurface: 'rgba(0, 154, 148, 0.12)',
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
  ambientGlow: 'rgba(108, 255, 244, 0.16)',
  glassOverlay: 'rgba(12, 35, 34, 0.78)',
  glassStroke: 'rgba(184, 255, 249, 0.22)',
  glassHighlight: 'rgba(233, 255, 252, 0.24)',
  glassSurface: 'rgba(18, 43, 41, 0.74)',
  glassSurfaceSoft: 'rgba(18, 48, 45, 0.48)',
  glassSurfaceStrong: 'rgba(13, 34, 33, 0.94)',
  glassBorder: 'rgba(184, 255, 249, 0.18)',
  glassBorderStrong: 'rgba(184, 255, 249, 0.34)',
  glassSheen: 'rgba(184, 255, 249, 0.12)',
  glassTint: 'rgba(108, 255, 244, 0.1)',
  contentSurface: DARK_CONTENT_SURFACE,
  contentSurfaceSoft: DARK_CONTENT_SURFACE_SOFT,
  contentSurfaceElevated: '#132A28',
  contentBorder: 'rgba(184, 255, 249, 0.14)',
  contentBorderStrong: 'rgba(184, 255, 249, 0.24)',
  onPrimarySurface: 'rgba(3, 19, 18, 0.10)',
  onPrimaryBorder: 'rgba(3, 19, 18, 0.16)',
  fieldSurface: 'rgba(235, 255, 252, 0.1)',
  fieldBorder: 'rgba(184, 255, 249, 0.18)',
  tabBarSurface: 'rgba(5, 24, 23, 0.94)',
  tabActiveSurface: 'rgba(108, 255, 244, 0.14)',
  scrim: 'rgba(1, 10, 10, 0.78)',
  cardShadow: shadow('0 18px 46px rgba(0, 0, 0, 0.36)', {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 30,
    elevation: 7,
  }),
  floatingShadow: shadow('0 24px 60px rgba(0, 0, 0, 0.48)', {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.48,
    shadowRadius: 36,
    elevation: 11,
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
    backgroundColor: effects.isLiquid ? effects.contentSurface : palette.surface,
    borderWidth: 1,
    borderColor: effects.isLiquid ? effects.contentBorder : palette.divider,
    borderRadius: borderRadius.xl,
    ...continuous,
    ...effects.cardShadow,
  },
  elevatedCard: {
    backgroundColor: effects.isLiquid ? effects.contentSurfaceElevated : palette.surfaceElevated,
    borderWidth: 1,
    borderColor: effects.isLiquid ? effects.contentBorderStrong : palette.divider,
    borderRadius: borderRadius.xl,
    ...continuous,
    ...effects.floatingShadow,
  },
  surface: {
    backgroundColor: effects.isLiquid ? effects.contentSurfaceSoft : palette.surfaceAlt,
    borderWidth: 1,
    borderColor: effects.isLiquid ? effects.contentBorder : palette.divider,
    borderRadius: borderRadius.lg,
    ...continuous,
  },
  field: {
    backgroundColor: effects.isLiquid ? effects.fieldSurface : palette.surfaceAlt,
    borderWidth: 1.2,
    borderColor: effects.isLiquid ? effects.fieldBorder : palette.divider,
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
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: effects.isLiquid ? effects.glassOverlay : palette.surfaceAlt,
    borderWidth: effects.isLiquid ? 1 : 0,
    borderColor: effects.glassStroke,
    alignItems: 'center',
    justifyContent: 'center',
    ...continuous,
  },
  tabBar: {
    backgroundColor: effects.isLiquid ? effects.tabBarSurface : palette.surface,
    borderTopWidth: 1,
    borderTopColor: effects.isLiquid ? effects.glassBorderStrong : palette.divider,
    ...effects.floatingShadow,
  },
  activeTab: {
    backgroundColor: effects.isLiquid ? effects.tabActiveSurface : palette.primaryFaded,
    borderWidth: 1,
    borderColor: effects.isLiquid ? effects.glassBorderStrong : palette.primaryFaded,
    ...continuous,
  },
  actionBar: {
    backgroundColor: effects.isLiquid ? effects.contentSurfaceElevated : palette.surface,
    borderTopWidth: 1,
    borderTopColor: effects.isLiquid ? effects.contentBorderStrong : palette.divider,
    ...effects.floatingShadow,
  },
  primaryButton: {
    backgroundColor: palette.primary,
    borderWidth: 1,
    borderColor: effects.isLiquid ? effects.glassBorderStrong : palette.primary,
    borderRadius: borderRadius.lg,
    ...continuous,
    ...effects.floatingShadow,
  },
  secondaryButton: {
    backgroundColor: palette.primaryFaded,
    borderWidth: 1,
    borderColor: effects.isLiquid ? effects.contentBorderStrong : palette.primaryFaded,
    borderRadius: borderRadius.lg,
    ...continuous,
  },
  dangerButton: {
    backgroundColor: effects.isLiquid ? effects.contentSurfaceElevated : palette.surface,
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
  accents: ThemeAccentTokens,
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
    accents,
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
  liquid_light: createTheme(
    'liquid_light',
    'Liquid Glass Light',
    false,
    liquidLightColors,
    liquidLightAccents,
    liquidLightEffects,
    'thickMaterial',
    28,
  ),
  liquid_dark: createTheme(
    'liquid_dark',
    'Liquid Glass Dark',
    true,
    liquidDarkColors,
    liquidDarkAccents,
    liquidDarkEffects,
    'thickMaterial',
    28,
  ),
};
