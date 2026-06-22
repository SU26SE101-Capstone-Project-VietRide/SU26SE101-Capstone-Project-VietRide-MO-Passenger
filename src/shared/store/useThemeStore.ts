import { create } from 'zustand';
import type { ThemeVariant } from '../theme/types';

export const DEFAULT_THEME_VARIANT: ThemeVariant = 'liquid_light';

interface ThemeState {
  currentTheme: ThemeVariant;
  setTheme: (variant: ThemeVariant) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: DEFAULT_THEME_VARIANT,
  setTheme: (variant) => set({ currentTheme: variant }),
}));
