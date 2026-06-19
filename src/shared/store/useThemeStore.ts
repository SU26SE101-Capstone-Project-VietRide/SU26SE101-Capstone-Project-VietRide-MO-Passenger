import { create } from 'zustand';
import { themes } from '../theme/themes';
import type { ThemeVariant } from '../theme/types';

interface ThemeState {
  currentTheme: ThemeVariant;
  setTheme: (variant: ThemeVariant) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: 'classic',
  setTheme: (variant) => set({ currentTheme: variant }),
}));
