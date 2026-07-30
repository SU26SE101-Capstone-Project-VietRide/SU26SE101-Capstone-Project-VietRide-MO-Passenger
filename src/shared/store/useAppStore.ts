/**
 * App Store — Global application state (non-feature-specific)
 *
 * Manages connectivity status, locale, global loading, etc.
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

export type Locale = 'en' | 'vi';
const DEFAULT_LOCALE: Locale = 'vi';

const isLocale = (value: unknown): value is Locale =>
  value === 'en' || value === 'vi';

interface AppState {
  /** Whether the device has internet connectivity */
  isOnline: boolean;

  /** Current app locale */
  locale: Locale;

  /** Global loading overlay (e.g., during app initialization) */
  isGlobalLoading: boolean;

  /** Whether persisted app preferences have been restored */
  hasHydrated: boolean;

  // ─── Actions ────────────────────────────────────────────
  setOnline: (status: boolean) => void;
  setLocale: (locale: Locale) => void;
  setGlobalLoading: (loading: boolean) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    set => ({
      isOnline: true,
      locale: DEFAULT_LOCALE,
      isGlobalLoading: false,
      hasHydrated: false,

      setOnline: status => set({ isOnline: status }),
      setLocale: locale => set({ locale }),
      setGlobalLoading: loading => set({ isGlobalLoading: loading }),
      setHasHydrated: hasHydrated => set({ hasHydrated }),
    }),
    {
      name: 'vietride-app-preferences',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ locale: state.locale }),
      merge: (persistedState, currentState) => {
        const persistedLocale = (
          persistedState as Partial<AppState> | undefined
        )?.locale;

        return {
          ...currentState,
          locale: isLocale(persistedLocale)
            ? persistedLocale
            : DEFAULT_LOCALE,
        };
      },
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[Preferences] Could not restore app preferences.');
        }
        useAppStore.setState({ hasHydrated: true });
      },
    },
  ),
);
