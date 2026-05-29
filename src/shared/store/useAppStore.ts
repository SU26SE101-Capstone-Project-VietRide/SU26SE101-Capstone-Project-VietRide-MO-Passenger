/**
 * App Store — Global application state (non-feature-specific)
 *
 * Manages connectivity status, locale, global loading, etc.
 */

import { create } from 'zustand';

type Locale = 'en' | 'vi';

interface AppState {
  /** Whether the device has internet connectivity */
  isOnline: boolean;

  /** Current app locale */
  locale: Locale;

  /** Global loading overlay (e.g., during app initialization) */
  isGlobalLoading: boolean;

  // ─── Actions ────────────────────────────────────────────
  setOnline: (status: boolean) => void;
  setLocale: (locale: Locale) => void;
  setGlobalLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  locale: 'vi',
  isGlobalLoading: false,

  setOnline: (status) => set({ isOnline: status }),
  setLocale: (locale) => set({ locale }),
  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),
}));
