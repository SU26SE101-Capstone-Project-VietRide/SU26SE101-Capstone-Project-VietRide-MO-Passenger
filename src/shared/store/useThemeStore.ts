import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ThemeVariant } from '../theme/types';

export const DEFAULT_THEME_VARIANT: ThemeVariant = 'liquid_light';
const THEME_VARIANTS: readonly ThemeVariant[] = [
  'liquid_light',
  'liquid_dark',
];

const isThemeVariant = (value: unknown): value is ThemeVariant =>
  typeof value === 'string'
  && THEME_VARIANTS.includes(value as ThemeVariant);

interface ThemeState {
  currentTheme: ThemeVariant;
  hasHydrated: boolean;
  setTheme: (variant: ThemeVariant) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      currentTheme: DEFAULT_THEME_VARIANT,
      hasHydrated: false,
      setTheme: variant => set({ currentTheme: variant }),
      setHasHydrated: hasHydrated => set({ hasHydrated }),
    }),
    {
      name: 'vietride-theme-preference',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ currentTheme: state.currentTheme }),
      merge: (persistedState, currentState) => {
        const persistedTheme = (
          persistedState as Partial<ThemeState> | undefined
        )?.currentTheme;

        return {
          ...currentState,
          currentTheme: isThemeVariant(persistedTheme)
            ? persistedTheme
            : DEFAULT_THEME_VARIANT,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[Preferences] Could not restore the saved theme.');
        }
        useThemeStore.setState({ hasHydrated: true });
      },
    },
  ),
);
