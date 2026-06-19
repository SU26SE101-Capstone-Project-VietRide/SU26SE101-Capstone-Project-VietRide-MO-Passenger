import { colors } from './colors';
import type { AppTheme, ThemeVariant } from './types';

// Liquid Glass uses thicker blurs and vibrant materials matching iOS native
export const themes: Record<ThemeVariant, AppTheme> = {
  classic: {
    variant: 'classic',
    name: 'Classic',
    isDark: false,
    colors: colors as any,
    glassOverlay: 'transparent',
    blurType: 'light',
    blurAmount: 10,
    cardStyle: { backgroundColor: colors.surface },
    surfaceStyle: { backgroundColor: colors.surfaceAlt },
  },
  liquid_light: {
    variant: 'liquid_light',
    name: 'Liquid Light',
    isDark: false,
    colors: colors as any,
    glassOverlay: 'rgba(255, 255, 255, 0.4)', // iOS thick light material
    blurType: 'thickMaterial',
    blurAmount: 32, // Intense blur
    cardStyle: { 
      backgroundColor: 'rgba(255, 255, 255, 0.65)', 
      borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    surfaceStyle: { 
      backgroundColor: 'rgba(240, 245, 255, 0.75)', 
      borderColor: 'rgba(255, 255, 255, 0.6)',
    },
  },
  liquid_dark: {
    variant: 'liquid_dark',
    name: 'Liquid Dark',
    isDark: true,
    colors: {
      ...colors,
      background: '#000000',
      textPrimary: '#FFFFFF',
      textSecondary: '#EBEBF5',
      textTertiary: 'rgba(235, 235, 245, 0.6)',
      surface: 'rgba(40, 40, 40, 0.55)',
      divider: 'rgba(84, 84, 88, 0.65)',
    } as any,
    glassOverlay: 'rgba(30, 30, 30, 0.45)', // iOS thick dark material
    blurType: 'thickMaterial',
    blurAmount: 32,
    cardStyle: { 
      backgroundColor: 'rgba(40, 40, 40, 0.65)', 
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    surfaceStyle: { 
      backgroundColor: 'rgba(28, 28, 30, 0.75)', 
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
};
