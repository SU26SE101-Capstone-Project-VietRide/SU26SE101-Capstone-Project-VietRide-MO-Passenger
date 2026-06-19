import { create } from 'zustand';
import type { ThemeVariant } from '../theme/types';

interface ThemeState {
  currentTheme: ThemeVariant;
  setTheme: (variant: ThemeVariant) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'liquid_light',
  setTheme: (variant) => set({ currentTheme: variant }),
}));
